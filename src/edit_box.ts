import { Key, KeyParser, Region, KeyType, Modifier } from "antsy";
import { PushAsyncIterator } from "ballvalve";
import { RichText } from "./rich_text";

const ELLIPSIS = "\u2026";

// FIXME: placeholder
const VISIBLE_CR = "@";

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
  visibleLinefeed?: string;

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
  visibleLinefeed: VISIBLE_CR,
  focused: true,
};

export class EditBox {
  config: EditBoxConfig;
  maxLength: number = 0;
  line: string = "";
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
    this.reset();
    this.resize();
    this.redraw();
  }

  reconfigure(config: Partial<EditBoxConfig>) {
    this.config = Object.assign({}, this.config, config);
    this.redraw();
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
    this.line = "";
    this.pos = 0;
    this.visiblePos = 0;
    this.historyIndex = this.history.length;
    this.saved = "";
    if (this.config.focused) this.moveCursor();
    this.setIdealHeight(1);
  }

  resize() {
    if (!this.config.allowScroll) {
      this.maxLength = Math.min(this.config.maxLength, this.region.cols * this.region.rows - 1);
      if (this.line.length > this.maxLength) this.line = this.line.slice(0, this.maxLength);
      if (this.pos > this.maxLength) this.pos = this.maxLength;
    }
    // in case we were resized to make room:
    this.visiblePos = 0;
    this.redraw();
  }

  redraw() {
    if (this.config.focused && this.moveCursor()) return;
    this._redraw(this.lines());
  }

  private _redraw(lines: RichText[]) {
    // in case of rendering bug, bail.
    if (this.region.rows < 1) return;

    const [ vx, vy ] = this.positionToCursor(lines, this.visiblePos);
    const displayLines = lines.slice(vy, vy + this.region.rows);
    const bottom = displayLines.length - 1;
    if (lines.length == 1 && this.visiblePos > 0 && this.config.heightChangeRequest) {
      // some edit boxes are restricted to one line. deal with that by
      // scrolling horizontally, but ask for more. if we get more, we'll do
      // proper word wrapping on the next go round.
      this.setIdealHeight(2);
    } else {
      this.setIdealHeight(lines.length);
    }

    // the visible position will be in mid-line if we only have one display line to work with
    if (vx > 0) displayLines[0] = displayLines[0].slice(vx);

    // put in ellipsis at the start or end if there's more text than we can display
    const ellipsis = RichText.string(this.config.suggestionColor, ELLIPSIS);
    if (this.visiblePos > 0) displayLines[0] = ellipsis.append(displayLines[0].slice(1));
    if (vy + this.region.rows < lines.length || (bottom >= 0 && displayLines[bottom].length >= this.region.cols)) {
      displayLines[bottom] = displayLines[bottom].slice(0, this.region.cols - 1).append(ellipsis);
    }

    this.region.color(this.config.color, this.config.backgroundColor).clear();
    displayLines.forEach((line, y) => line.render(this.region.at(0, y), undefined, this.config.color));
  }

  // move the canvas cursor to `pos`, possibly shifting the part of the text that's visible.
  // returns true if it had to trigger a redraw.
  moveCursor(pos: number = this.pos): boolean {
    return this._moveCursor(pos, this.lines());
  }

  _moveCursor(pos: number, lines: RichText[]): boolean {
    const oldVisiblePos = this.visiblePos;

    if (this.config.allowScroll) {
      if (this.region.rows == 1) {
        // scroll around horizontally by half a line at a time
        const stride = Math.floor(this.region.cols / 2);
        // fix in case a resize has made our offset weird:
        this.visiblePos = Math.floor(this.visiblePos / stride) * stride;
        while (pos <= this.visiblePos && this.visiblePos > 0) this.visiblePos -= stride;
        while (pos >= this.visiblePos + this.region.cols) this.visiblePos += stride;
      } else {
        // ensure we're moving one line at a time
        let [ vx, vy ] = this.positionToCursor(lines, this.visiblePos);
        if (vx > 0) {
          this.visiblePos -= vx;
          vx = 0;
        }

        while (pos <= this.visiblePos && this.visiblePos > 0) {
          vy--;
          this.visiblePos -= lines[vy].length;
        }
        let visible = lines.slice(vy, vy + this.region.rows).map(line => line.length).reduce((a, b) => a + b, 0);
        while (pos > this.visiblePos + visible - 1 && vy < lines.length - this.region.rows) {
          this.visiblePos += lines[vy].length;
          visible -= lines[vy].length;
          if (vy + this.region.rows < lines.length) visible += lines[vy + this.region.rows].length;
          vy++;
        }
      }

      if (this.visiblePos != oldVisiblePos) this._redraw(lines);
    }

    this.pos = pos;
    const [ vx, vy ] = this.positionToCursor(lines, this.visiblePos);
    const [ px, py ] = this.positionToCursor(lines, pos);
    this.region.moveCursor(px - vx, py - vy);
    return this.visiblePos != oldVisiblePos;
  }

  attachStream(s: AsyncIterable<Buffer | string>): AsyncIterable<string> {
    // launch a background "task" to stream data into the key parser
    setImmediate(async () => {
      for await (const data of s) this.keyParser.feed(data.toString("utf-8"));
    });
    return this.events;
  }

  // break up our text into lines that will each fit one line of our box.
  // include linefeeds and any active suggestion.
  private lines(): RichText[] {
    // first, any real "\n". put a visible CR in them if desired.
    let lines = this.line.split("\n").map(s => RichText.string(this.config.color, s));

    if (this.config.visibleLinefeed) {
      const lf = RichText.string(this.config.suggestionColor, this.config.visibleLinefeed);
      for (let y = 0; y < lines.length - 1; y++) lines[y] = lines[y].append(lf);
    }
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
    return lines;
  }

  // return [x, y] of where the position would be in the line
  private positionToCursor(lines: RichText[], pos: number = this.pos): [ number, number ] {
    let y = 0;
    while (y < lines.length && lines[y].length < pos) {
      pos -= lines[y].length;
      y++;
    }
    // past the end? ... shouldn't really happen but whatever.
    if (y >= lines.length) return [ lines[lines.length - 1].length, lines.length - 1 ];
    if (pos == this.region.cols && y < lines.length - 1) {
      y++;
      pos = 0;
    }
    return [ pos, y ];
  }

  private setIdealHeight(lines: number) {
    if (this.idealHeight == lines) return;
    this.idealHeight = lines;
    if (this.config.heightChangeRequest) setTimeout(() => this.config.heightChangeRequest?.(lines), 0);
  }

  content(): string {
    return this.line;
  }

  contentLeft(): string {
    return this.line.slice(0, this.pos);
  }

  contentRight(): string {
    return this.line.slice(this.pos);
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
    this.line = this.line.slice(0, this.pos) + text + this.line.slice(this.pos);
    this.pos += text.length;
    if (this.line.length > this.maxLength) {
      // truncate and redraw. boo.
      this.line = this.line.slice(0, this.maxLength);
      if (this.pos > this.line.length) this.pos = this.line.length;
    }
    this.redraw();
  }

  tab() {
    if (this.suggestions && this.suggestionIndex !== undefined) {
      // next suggestion
      this.suggestionIndex = (this.suggestionIndex + 1) % this.suggestions.length;
      this.redraw();
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
    this.redraw();
  }

  enter() {
    if (this.config.enterAction == "ignore") return;
    if (this.config.enterAction == "insert") return this.insert("\n");

    if (this.line.length > 0 && this.config.useHistory) this.recordHistory(this.line);
    const line = this.line;
    this.reset();
    this.redraw();
    this.events.push(line);
  }

  backspace() {
    if (this.pos == 0) return;
    this.pos -= 1;
    this.line = this.line.slice(0, this.pos) + this.line.slice(this.pos + 1);
    this.redraw();
  }

  deleteForward() {
    if (this.pos == this.line.length) return;
    this.line = this.line.slice(0, this.pos) + this.line.slice(this.pos + 1);
    this.redraw();
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
    if (this.pos >= this.line.length) return;
    this.moveCursor(this.pos + 1);
  }

  wordLeft() {
    let pos = this.pos;
    while (pos > 0 && !this.line[pos - 1].match(/[\w\d]/)) pos -= 1;
    while (pos > 0 && this.line[pos - 1].match(/[\w\d]/)) pos -= 1;
    this.moveCursor(pos);
  }

  wordRight() {
    let pos = this.pos;
    while (pos < this.line.length && !this.line[pos].match(/[\w\d]/)) pos += 1;
    while (pos < this.line.length && this.line[pos].match(/[\w\d]/)) pos += 1;
    this.moveCursor(pos);
  }

  scrollUp() {
    const roundFactor = this.region.rows == 1 ? Math.floor(this.region.cols / 2) : this.region.cols;
    if (this.pos < roundFactor) return;
    this.moveCursor(this.pos - roundFactor);
  }

  scrollDown() {
    const roundFactor = this.region.rows == 1 ? Math.floor(this.region.cols / 2) : this.region.cols;
    if (this.pos + roundFactor > this.line.length) return;
    this.moveCursor(this.pos + roundFactor);
  }

  home() {
    this.moveCursor(0);
  }

  end() {
    this.moveCursor(this.line.length);
  }

  deleteToEol() {
    if (this.pos == this.line.length) return;
    this.line = this.line.slice(0, this.pos);
    this.redraw();
  }

  transpose() {
    if (this.pos == 0 || this.pos == this.line.length) return;
    this.line = this.line.slice(0, this.pos - 1) + this.line[this.pos] + this.line[this.pos - 1] + this.line.slice(this.pos + 1);
    this.redraw();
  }

  deleteWord() {
    let pos = this.pos;
    while (pos > 0 && !this.line[pos - 1].match(/[\w\d]/)) pos -= 1;
    while (pos > 0 && this.line[pos - 1].match(/[\w\d]/)) pos -= 1;
    this.line = this.line.slice(0, pos) + this.line.slice(this.pos);
    this.redraw();
    this.moveCursor(pos);
  }

  historyPrevious() {
    if (this.historyIndex == 0) return;
    if (this.historyIndex == this.history.length) this.saved = this.line;
    this.historyIndex -= 1;
    this.line = this.history[this.historyIndex];
    this.pos = this.line.length;
    this.redraw();
  }

  historyNext() {
    if (this.historyIndex == this.history.length) return;
    this.historyIndex += 1;
    this.line = (this.historyIndex == this.history.length) ? this.saved : this.history[this.historyIndex];
    this.pos = this.line.length;
    this.redraw();
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
    this.redraw();
  }

  private suggestionLength(): number {
    if (!this.suggestions || this.suggestionIndex === undefined) return 0;
    return this.suggestions[this.suggestionIndex].length;
  }
}
