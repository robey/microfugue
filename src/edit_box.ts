import { Key, KeyParser, Region, KeyType, Modifier } from "antsy";
import { PushAsyncIterator } from "ballvalve";
import { RichText } from "./rich_text";

const ELLIPSIS = "\u2026";

// <-'
const VISIBLE_CR = "\u21b2";

export interface EditBoxConfig {
  // colors for the actual text being edited
  color: string;
  backgroundColor: string;

  // a softer color for auto-complete suggestions, and the ellipses when the full text won't fit
  suggestionColor: string;

  // maximum text size -- if allowScroll is false, this may be truncated to the region size
  maxLength: number;

  // when keeping command history, how many should we keep? you can also pre-seed a saved history.
  maxHistory: number;
  history: string[];

  // scroll vertically to allow text that's bigger than the region?
  allowScroll: boolean;

  // if you'd like to resize the region based on content, this callback will
  // be invoked every time the "ideal" height of the region changes. (you are
  // free to ignore or clamp the request.)
  heightChangeRequest?: (lines: number) => void;

  // keep history and navigate it with arrow keys?
  useHistory: boolean;

  // when the user hits "enter", should we ignore it ("passive" edit), insert
  // a literal linefeed, or commit the line?
  enterAction: "ignore" | "insert" | "commit";

  // word wrap multi-line edits?
  wordWrap: boolean;

  // draw a visible linefeed when inserting them?
  visibleLinefeed: boolean;

  // own the cursor? (if true, we move the canvas's cursor to the edit
  // position. if false, we're viewing, not editing.)
  focused: boolean;
}

const DEFAULT_CONFIG: EditBoxConfig = {
  color: "#ccc",
  backgroundColor: "#000",
  suggestionColor: "#777",
  maxLength: 255,
  maxHistory: 100,
  history: [],
  allowScroll: false,
  useHistory: true,
  enterAction: "commit",
  wordWrap: false,
  visibleLinefeed: true,
  focused: true,
};

export class EditBox {
  config: EditBoxConfig;
  maxLength: number = 0;

  // the actual text, and a cache of individual lines
  text: string = "";
  lines: RichText[] = [];
  // cache of the visible linefeed, if any
  cachedLinefeed: RichText;

  // where's the cursor?
  pos: number = 0;
  // when scrolling around a region, where does the visible text start?
  visiblePos: number = 0;
  // what's the ideal height?
  idealHeight: number = 1;

  // when traversing history:
  history: string[] = [];
  historyIndex: number = 0;
  saved: string = "";

  // allow custom key bindings
  customBindings: [ Key, (key: Key, editBox: EditBox) => void ][] = [];

  // optionally provide a list of completions if the user hits TAB
  autoComplete?: (text: string) => (string[] | undefined);
  // cached while they tab through the options:
  suggestions?: string[];
  suggestionIndex?: number;

  events = new PushAsyncIterator<string>();
  keyParser = new KeyParser(keys => {
    for (const key of keys) this.feed(key);
  });

  constructor(public region: Region, options: Partial<EditBoxConfig> = {}) {
    this.region = region;
    this.region.onResize(() => this.resize());
    this.config = Object.assign({}, DEFAULT_CONFIG, options);
    this.history = this.config.history.slice();
    this.maxLength = this.config.maxLength;
    this.cachedLinefeed = RichText.string(this.config.suggestionColor, this.config.visibleLinefeed ? VISIBLE_CR : " ");
    this.reset();
    this.resize();
  }

  reconfigure(config: Partial<EditBoxConfig>) {
    this.config = Object.assign({}, this.config, config);
    this.maxLength = this.config.maxLength;
    this.cachedLinefeed = RichText.string(this.config.suggestionColor, this.config.visibleLinefeed ? VISIBLE_CR : " ");
    this.redraw(true);
  }

  clearHistory() {
    this.history = [];
    this.historyIndex = 0;
  }

  clearBindings() {
    this.customBindings = [];
  }

  bind(key: Key, f: (key: Key, editBox: EditBox) => void) {
    const index = this.customBindings.findIndex(([ k, _ ]) => k.equals(key));
    if (index >= 0) this.customBindings.splice(index, 1);
    this.customBindings.push([ key, f ]);
  }

  reset() {
    this.text = "";
    this.pos = 0;
    this.visiblePos = 0;
    this.historyIndex = this.history.length;
    this.saved = "";
    if (this.config.focused) this.moveCursor();
    this.setIdealHeight(1);
    this.redraw(true);
  }

  resize() {
    if (!this.config.allowScroll) {
      this.maxLength = Math.min(this.config.maxLength, this.region.cols * this.region.rows - 1);
      if (this.text.length > this.maxLength) this.text = this.text.slice(0, this.maxLength);
      if (this.pos > this.maxLength) this.pos = this.maxLength;
    }
    // in case we were resized to make room:
    this.visiblePos = 0;
    this.redraw(true);
  }

  redraw(textChanged: boolean = false) {
    if (textChanged) this.rebuildLines();
    if (this.config.focused && this.moveCursor(this.pos)) return;
    this._redraw();
  }

  private _redraw() {
    // in case of rendering bug, bail.
    if (this.region.rows < 1) return;

    const [ vx, vy ] = this.positionToCursor(this.visiblePos);
    const displayLines = this.lines.slice(vy, vy + this.region.rows);
    const bottom = displayLines.length - 1;
    if (this.lines.length == 1 && this.visiblePos > 0 && this.config.heightChangeRequest) {
      // some edit boxes are restricted to one line. deal with that by
      // scrolling horizontally, but ask for more. if we get more, we'll do
      // proper word wrapping on the next go round.
      this.setIdealHeight(2);
    } else {
      this.setIdealHeight(this.lines.length);
    }

    // the visible position will be in mid-line if we only have one display line to work with
    if (vx > 0) displayLines[0] = displayLines[0].slice(vx);

    // put in ellipsis at the start or end if there's more text than we can display
    const ellipsis = RichText.string(this.config.suggestionColor, ELLIPSIS);
    if (this.visiblePos > 0) displayLines[0] = ellipsis.append(displayLines[0].slice(1));
    if (vy + this.region.rows < this.lines.length || (bottom >= 0 && displayLines[bottom].length >= this.region.cols)) {
      displayLines[bottom] = displayLines[bottom].slice(0, this.region.cols - 1).append(ellipsis);
    }

    this.region.color(this.config.color, this.config.backgroundColor).clear();
    displayLines.forEach((line, y) => line.render(this.region.at(0, y), undefined, this.config.color));
  }

  // move the canvas cursor to `pos`, possibly shifting the part of the text that's visible.
  // returns true if it had to trigger a redraw.
  moveCursor(pos: number = this.pos): boolean {
    this.pos = pos;
    const didRedraw = this.config.allowScroll && this.adjustVisible(pos);
    const [ vx, vy ] = this.positionToCursor(this.visiblePos);
    let [ px, py ] = this.positionToCursor();
    this.region.moveCursor(px - vx, py - vy);
    return didRedraw;
  }

  // shift the part of the text that's visible, if the cursor is off-camera.
  // returns true if it had to redraw.
  private adjustVisible(pos: number = this.pos): boolean {
    const oldVisiblePos = this.visiblePos;

    if (this.region.rows == 1) {
      // scroll around horizontally by half a line at a time
      const stride = Math.floor(this.region.cols / 2);
      // fix in case a resize has made our offset weird:
      this.visiblePos = Math.floor(this.visiblePos / stride) * stride;
      while (pos <= this.visiblePos && this.visiblePos > 0) this.visiblePos -= stride;
      while (pos >= this.visiblePos + this.region.cols) this.visiblePos += stride;
    } else {
      // ensure we're moving one line at a time
      let [ vx, vy ] = this.positionToCursor(this.visiblePos);
      if (vx > 0) {
        this.visiblePos -= vx;
        vx = 0;
      }

      while (pos <= this.visiblePos && this.visiblePos > 0) {
        vy--;
        this.visiblePos -= this.lines[vy].length;
      }
      let visible = this.lines.slice(vy, vy + this.region.rows).map(line => line.length).reduce((a, b) => a + b, 0);
      while (pos > this.visiblePos + visible - 1 && vy < this.lines.length - this.region.rows) {
        this.visiblePos += this.lines[vy].length;
        visible -= this.lines[vy].length;
        if (vy + this.region.rows < this.lines.length) visible += this.lines[vy + this.region.rows].length;
        vy++;
      }
    }

    if (this.visiblePos == oldVisiblePos) return false;
    this._redraw();
    return true;
  }

  attachStream(s: AsyncIterable<Buffer | string>): AsyncIterable<string> {
    // launch a background "task" to stream data into the key parser
    setImmediate(async () => {
      for await (const data of s) this.keyParser.feed(data.toString("utf-8"));
    });
    return this.events;
  }

  private get lastLine(): RichText {
    return this.lines[this.lines.length - 1] ?? RichText.string(this.config.color, "");
  }

  // break up our text into lines that will each fit one line of our box.
  // include linefeeds and any active suggestion.
  private rebuildLines() {
    // first, any real "\n". put a visible CR in them if desired.
    let lines = this.text.split("\n").map(s => RichText.string(this.config.color, s));
    for (let y = 0; y < lines.length - 1; y++) lines[y] = lines[y].append(this.cachedLinefeed);
    if (this.suggestions && this.suggestionIndex !== undefined) {
      const add = RichText.string(this.config.suggestionColor, this.suggestions[this.suggestionIndex]);
      lines[lines.length - 1] = lines[lines.length - 1].append(add);
    }

    // only wrap if we have more than one line to edit in
    if (this.region.rows > 1) {
      const width = this.config.wordWrap ? this.region.cols - 1 : this.region.cols;
      lines = lines.map(line => line.wrap(width, this.config.wordWrap)).flat();
      // make sure there's extra space if the cursor would be off-screen
      if (lines[lines.length - 1].length == this.region.cols) lines.push(RichText.string(this.config.color, ""));
    }

    this.lines = lines;
  }

  // return [x, y] of where the position would be in the line
  private positionToCursor(pos: number = this.pos): [ number, number ] {
    const postLF = pos > 0 && this.text[pos - 1] == "\n";
    let y = 0;
    while (y < this.lines.length && this.lines[y].length < pos) {
      pos -= this.lines[y].length;
      y++;
    }
    // past the end? ... shouldn't really happen but whatever.
    if (y >= this.lines.length) return [ this.lastLine.length, this.lines.length - 1 ];
    if ((pos == this.lines[y].length || postLF) && y < this.lines.length - 1) {
      y++;
      pos = 0;
    }
    return [ pos, y ];
  }

  private cursorToPosition(x: number, y: number): number {
    let pos = 0;
    for (let i = 0; i < y && i < this.lines.length; i++) pos += this.lines[i].length;
    if (y >= this.lines.length) return pos;
    x = Math.min(x, this.lines[y].length);
    pos += x;
    if (y < this.lines.length - 1 && x == this.lines[y].length) pos--;
    // if (x == this.lines[y].length && pos > 0 && (this.text[pos - 1] == "\n" || x == this.region.cols)) pos--;
    return pos;
  }

  private setIdealHeight(lines: number) {
    if (this.idealHeight == lines) return;
    this.idealHeight = lines;
    if (this.config.heightChangeRequest) setTimeout(() => this.config.heightChangeRequest?.(lines), 0);
  }

  content(): string {
    return this.text;
  }

  contentLeft(): string {
    return this.text.slice(0, this.pos);
  }

  contentRight(): string {
    return this.text.slice(this.pos);
  }

  feed(key: Key) {
    for (const [ k, f ] of this.customBindings) if (key.equals(k)) {
      f(key, this);
      return;
    }

    if (this.suggestionIndex !== undefined) {
      if (key.modifiers != 0 || (key.type != KeyType.Tab && key.type != KeyType.Right)) {
        this.clearSuggestions();
      }
    }

    if (key.modifiers == 0) {
      switch (key.type) {
        case KeyType.Backspace:
          return this.backspace();
        case KeyType.Delete:
          return this.deleteForward();
        case KeyType.Tab:
          return this.tab();
        case KeyType.Return:
          return this.enter();
        case KeyType.Left:
          return this.left();
        case KeyType.Right:
          return this.right();
        case KeyType.Up:
          if (this.config.useHistory) {
            return this.historyPrevious();
          } else {
            return this.scrollUp();
          }
        case KeyType.Down:
          if (this.config.useHistory) {
            return this.historyNext();
          } else {
            return this.scrollDown();
          }
        case KeyType.Home:
          return this.home();
        case KeyType.End:
          return this.end();
        case KeyType.Normal:
          return this.insert(key.key);
      }
    } else if (key.modifiers == Modifier.Control) {
      switch (key.type) {
        case KeyType.Left:
          return this.wordLeft();
        case KeyType.Right:
          return this.wordRight();
        case KeyType.Up:
          return this.scrollUp();
        case KeyType.Down:
          return this.scrollDown();
        case KeyType.Normal:
          // look for unix editing keys
          switch (key.key) {
            case "A":
              return this.home();
            case "B":
              return this.left();
            case "D":
              return this.deleteForward();
            case "E":
              return this.end();
            case "F":
              return this.right();
            case "H":
              return this.backspace();
            case "J":
            case "M":
              return this.enter();
            case "K":
              return this.deleteToEol();
            case "N":
              if (this.config.useHistory) {
                return this.historyNext();
              } else {
                return this.scrollDown();
              }
            case "P":
              if (this.config.useHistory) {
                return this.historyPrevious();
              } else {
                return this.scrollUp();
              }
            case "T":
              return this.transpose();
            case "W":
              return this.deleteWord();
          }
      }
    }
  }


  // ----- commands

  insert(text: string) {
    this.text = this.text.slice(0, this.pos) + text + this.text.slice(this.pos);
    this.pos += text.length;
    if (this.text.length > this.maxLength) {
      // truncate and redraw. boo.
      this.text = this.text.slice(0, this.maxLength);
      if (this.pos > this.text.length) this.pos = this.text.length;
    }
    this.redraw(true);
  }

  tab() {
    if (this.suggestions && this.suggestionIndex !== undefined) {
      // next suggestion
      this.suggestionIndex = (this.suggestionIndex + 1) % this.suggestions.length;
      this.redraw(true);
      return;
    }

    if (!this.autoComplete) return;
    const suggestions = this.autoComplete(this.content());
    if (suggestions === undefined || suggestions.length == 0) return;
    if (suggestions.length == 1) {
      this.insert(suggestions[0]);
      return;
    }

    // find commonalities?
    while (suggestions.every(s => s.length > 0 && s[0] == suggestions[0][0])) {
      this.insert(suggestions[0][0]);
      for (let i = 0; i < suggestions.length; i++) suggestions[i] = suggestions[i].slice(1);
    }
    this.suggestions = suggestions;
    this.suggestionIndex = 0;
    this.redraw(true);
  }

  enter() {
    if (this.config.enterAction == "ignore") return;
    if (this.config.enterAction == "insert") return this.insert("\n");
    if (this.text.length > 0 && this.config.useHistory) this.recordHistory(this.text);
    const text = this.text;
    this.reset();
    this.redraw(true);
    this.events.push(text);
  }

  backspace() {
    if (this.pos == 0) return;
    this.pos -= 1;
    this.text = this.text.slice(0, this.pos) + this.text.slice(this.pos + 1);
    this.redraw(true);
  }

  deleteForward() {
    if (this.pos == this.text.length) return;
    this.text = this.text.slice(0, this.pos) + this.text.slice(this.pos + 1);
    this.redraw(true);
  }

  left() {
    if (this.pos == 0) return;
    this.moveCursor(this.pos - 1);
  }

  right() {
    if (this.suggestions && this.suggestionIndex !== undefined) {
      // accept current suggestion
      this.insert(this.suggestions[this.suggestionIndex]);
      this.clearSuggestions();
      return;
    }
    if (this.pos >= this.text.length) return;
    this.moveCursor(this.pos + 1);
  }

  wordLeft() {
    let pos = this.pos;
    while (pos > 0 && !this.text[pos - 1].match(/[\w\d]/)) pos -= 1;
    while (pos > 0 && this.text[pos - 1].match(/[\w\d]/)) pos -= 1;
    this.moveCursor(pos);
  }

  wordRight() {
    let pos = this.pos;
    while (pos < this.text.length && !this.text[pos].match(/[\w\d]/)) pos += 1;
    while (pos < this.text.length && this.text[pos].match(/[\w\d]/)) pos += 1;
    this.moveCursor(pos);
  }

  scrollUp() {
    if (this.region.rows == 1) {
      // scan left
      const stride = Math.floor(this.region.cols / 2);
      this.moveCursor(Math.max(this.pos - stride, 0));
    } else {
      const [ x, y ] = this.positionToCursor();
      if (y == 0) return;
      this.moveCursor(this.cursorToPosition(x, y - 1));
    }
  }

  scrollDown() {
    if (this.region.rows == 1) {
      // scan right
      const stride = Math.floor(this.region.cols / 2);
      this.moveCursor(Math.min(this.pos + stride, this.text.length));
    } else {
      const [ x, y ] = this.positionToCursor();
      if (y == this.lines.length - 1) return;
      this.moveCursor(this.cursorToPosition(x, y + 1));
    }
  }

  home() {
    const [ x, y ] = this.positionToCursor();
    this.moveCursor(this.cursorToPosition(0, y));
  }

  end() {
    const [ x, y ] = this.positionToCursor();
    this.moveCursor(this.cursorToPosition(this.text.length, y));
  }

  deleteToEol() {
    if (this.pos == this.text.length) return;
    const [ x, y ] = this.positionToCursor();
    this.text = this.text.slice(0, this.pos) + this.text.slice(this.cursorToPosition(this.text.length, y));
    this.redraw(true);
  }

  transpose() {
    if (this.pos == 0 || this.pos == this.text.length) return;
    this.text = this.text.slice(0, this.pos - 1) + this.text[this.pos] + this.text[this.pos - 1] + this.text.slice(this.pos + 1);
    this.redraw(true);
  }

  deleteWord() {
    let pos = this.pos;
    while (pos > 0 && !this.text[pos - 1].match(/[\w\d]/)) pos -= 1;
    while (pos > 0 && this.text[pos - 1].match(/[\w\d]/)) pos -= 1;
    this.text = this.text.slice(0, pos) + this.text.slice(this.pos);
    this.redraw(true);
    this.moveCursor(pos);
  }

  historyPrevious() {
    if (this.historyIndex == 0) return;
    if (this.historyIndex == this.history.length) this.saved = this.text;
    this.historyIndex -= 1;
    this.text = this.history[this.historyIndex];
    this.pos = this.text.length;
    this.redraw(true);
  }

  historyNext() {
    if (this.historyIndex == this.history.length) return;
    this.historyIndex += 1;
    this.text = (this.historyIndex == this.history.length) ? this.saved : this.history[this.historyIndex];
    this.pos = this.text.length;
    this.redraw(true);
  }

  recordHistory(line: string) {
    // remove any redundant copy of this line from the history.
    const i = this.history.indexOf(line);
    if (i >= 0) this.history.splice(i, 1);
    this.history.push(line);
    if (this.history.length > this.config.maxHistory) {
      this.history = this.history.slice(this.history.length - this.config.maxHistory);
    }
  }


  // ----- auto-complete

  clearSuggestions() {
    this.suggestions = undefined;
    this.suggestionIndex = undefined;
    this.redraw(true);
  }
}
