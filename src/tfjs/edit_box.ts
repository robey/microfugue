import { Key, KeyParser, Region, KeyType, Modifier } from "antsy";
import { PushAsyncIterator } from "ballvalve";

export interface EditBoxConfig {
  color: string;
  backgroundColor: string;
  maxLength: number;
  history: string[];
  maxHistory: number;
}

const DEFAULT_CONFIG: EditBoxConfig = {
  color: "#ccc",
  backgroundColor: "#000",
  maxLength: 255,
  history: [],
  maxHistory: 100,
};

export class EditBox {
  config: EditBoxConfig;
  maxLength: number = 0;
  line: string = "";
  pos: number = 0;

  // when traversing history:
  history: string[] = [];
  historyIndex: number = 0;
  saved: string = "";

  // allow custom key bindings
  customBindings: [ Key, (key: Key, editBox: EditBox) => void ][] = [];

  events = new PushAsyncIterator<string>();
  keyParser = new KeyParser(keys => {
    for (const key of keys) this.feed(key);
  });

  constructor(public region: Region, options: Partial<EditBoxConfig> = {}) {
    this.region = region;
    this.config = Object.assign({}, DEFAULT_CONFIG, options);
    this.history = this.config.history.slice();
    this.reset();
    this.resize();
    this.redraw();
  }

  clearHistory() {
    this.history = [];
    this.historyIndex = 0;
  }

  bind(key: Key, f: (key: Key, editBox: EditBox) => void) {
    const index = this.customBindings.findIndex(([ k, _ ]) => k.equals(key));
    if (index >= 0) this.customBindings.splice(index, 1);
    this.customBindings.push([ key, f ]);
  }

  reset() {
    this.line = "";
    this.pos = 0;
    this.historyIndex = this.history.length;
    this.saved = "";
    this.customBindings = [];
    this.moveCursor();
  }

  resize() {
    this.maxLength = Math.min(this.config.maxLength, this.region.cols * this.region.rows - 1);
    if (this.line.length > this.maxLength) this.line = this.line.slice(0, this.maxLength);
    if (this.pos > this.maxLength) this.pos = this.maxLength;
  }

  redraw() {
    this.region.color(this.config.color, this.config.backgroundColor).clear().at(0, 0).write(this.line);
    this.moveCursor();
  }

  moveCursor(pos: number = this.pos) {
    this.pos = pos;
    this.region.moveCursor(pos % this.region.cols, Math.floor(pos / this.region.cols));
  }

  attachStream(s: AsyncIterable<Buffer | string>): AsyncIterable<string> {
    // launch a background "task" to stream data into the key parser
    setImmediate(async () => {
      for await (const data of s) this.keyParser.feed(data.toString("utf-8"));
    });
    return this.events;
  }

  feed(key: Key) {
    for (const [ k, f ] of this.customBindings) if (key.equals(k)) {
      f(key, this);
      return;
    }

    if (key.modifiers == 0) {
      switch (key.type) {
        case KeyType.Backspace:
          return this.backspace();
        case KeyType.Delete:
          return this.deleteForward();
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
            case "C":
              process.exit(0);
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
}
