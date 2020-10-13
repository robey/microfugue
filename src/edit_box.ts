import { Key, KeyParser, Region, KeyType, Modifier } from "antsy";
import { PushAsyncIterator } from "ballvalve";

const ELLIPSIS = "\u2026";

export interface EditBoxConfig {
  color: string;
  backgroundColor: string;
  suggestionColor: string;
  maxLength: number;
  history: string[];
  maxHistory: number;

  // scroll vertically to allow text that's bigger than the region?
  allowScroll: boolean;
}

const DEFAULT_CONFIG: EditBoxConfig = {
  color: "#ccc",
  backgroundColor: "#000",
  suggestionColor: "#777",
  maxLength: 255,
  history: [],
  maxHistory: 100,
  allowScroll: false,
};

export class EditBox {
  config: EditBoxConfig;
  maxLength: number = 0;
  line: string = "";
  pos: number = 0;

  // when scrolling around a region, where does the visible text start?
  visiblePos: number = 0;

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
    this.moveCursor();
  }

  resize() {
    if (!this.config.allowScroll) {
      this.maxLength = Math.min(this.config.maxLength, this.region.cols * this.region.rows - 1);
      if (this.line.length > this.maxLength) this.line = this.line.slice(0, this.maxLength);
      if (this.pos > this.maxLength) this.pos = this.maxLength;
    }
    this.redraw();
  }

  redraw() {
    if (this.moveCursor()) return;
    this._redraw();
  }

  private _redraw() {
    const regionSize = this.region.rows * this.region.cols;
    let displayText = this.line.slice(this.visiblePos, this.visiblePos + regionSize);
    if (this.visiblePos > 0) displayText = ELLIPSIS + displayText.slice(1);
    if (this.visiblePos + regionSize < this.line.length) displayText = displayText.slice(0, -1) + ELLIPSIS;
    this.region.color(this.config.color, this.config.backgroundColor).clear().at(0, 0).write(displayText);
    if (this.suggestions && this.suggestionIndex !== undefined) {
      this.region.color(this.config.suggestionColor).write(this.suggestions[this.suggestionIndex]);
    }
  }

  // returns true if it had to trigger a redraw.
  moveCursor(pos: number = this.pos): boolean {
    const oldVisiblePos = this.visiblePos;
    const regionSize = this.region.rows * this.region.cols;
    // scroll a one-line edit box by a half line at a time:
    const roundFactor = this.region.rows == 1 ? Math.floor(this.region.cols / 2) : this.region.cols;
    // fix in case a resize has made our offset weird:
    this.visiblePos = Math.floor(this.visiblePos / roundFactor) * roundFactor;

    while (pos < this.visiblePos) this.visiblePos -= roundFactor;
    while (pos >= this.visiblePos + regionSize) this.visiblePos += roundFactor;
    if (this.visiblePos != oldVisiblePos) this._redraw();

    this.pos = pos;
    const rPos = pos - this.visiblePos;
    this.region.moveCursor(rPos % this.region.cols, Math.floor(rPos / this.region.cols));
    return this.visiblePos != oldVisiblePos;
  }

  attachStream(s: AsyncIterable<Buffer | string>): AsyncIterable<string> {
    // launch a background "task" to stream data into the key parser
    setImmediate(async () => {
      for await (const data of s) this.keyParser.feed(data.toString("utf-8"));
    });
    return this.events;
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
          return this.historyPrevious();
        case KeyType.Down:
          return this.historyNext();
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
              return this.historyNext();
            case "P":
              return this.historyPrevious();
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
    this.recordHistory(this.line);
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
}
