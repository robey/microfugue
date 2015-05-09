"use strict";

const events = require("events");
const util = require("util");

const CONTROL_A = 0x01;
const CONTROL_B = 0x02;
const CONTROL_D = 0x04;
const CONTROL_E = 0x05;
const CONTROL_F = 0x06;
const CONTROL_H = 0x08;
const CONTROL_J = 0x0a;
const CONTROL_K = 0x0b;
const CONTROL_M = 0x0d;
const CONTROL_N = 0x0e;
const CONTROL_P = 0x10;
const ESC = 0x1b;
const SPACE = 0x20;
const DIGIT0 = 0x30;
const DIGIT9 = 0x39;
const COLON = 0x3a;
const SEMICOLON = 0x3b;
const LBRACKET = 0x5b;
const DELETE = 0x7f;

// track state of CSI (xterm/vt100/ansi command sequence prefix)
const STATE_NORMAL = 0;
const STATE_ESC = 1;
const STATE_CSI = 2;
const CSI_TIMEOUT = 250;

const DEFAULT_MAXLENGTH = 255;

class CsiState {
  constructor() {
    this.state = STATE_NORMAL;
    this.changed = 0;  // timer
    this.commandBuffer = "";
    this.meta = false;
  }

  consume(ch) {
    const now = Date.now();
    if (this.state != STATE_NORMAL && now - this.changed > CSI_TIMEOUT) {
      this.state = STATE_NORMAL;
      this.meta = false;
    }

    switch (this.state) {
      case STATE_CSI:
        // command codes continue until we hit something that isn't a digit or ";".
        this.changed = now;
        this.commandBuffer += String.fromCharCode(ch);
        if (ch >= DIGIT0 && ch <= SEMICOLON) return null;
        this.state = STATE_NORMAL;
        this.meta = false;
        return this.commandBuffer;
      case STATE_ESC:
        switch (ch) {
          case LBRACKET:
            this.changed = now;
            this.state = STATE_CSI;
            this.commandBuffer = this.meta ? "M-" : "";
            return null;
          case ESC:
            this.changed = now;
            this.meta = true;
            return null;
          default:
            // this is an error. just treat it as if the ESC timed out.
            this.state = STATE_NORMAL;
            this.meta = false;
            // fall through.
        }
      default:
        if (ch == ESC) {
          this.changed = now;
          this.state = STATE_ESC;
          return null;
        }
        return ch;
    }
  }
}

class EditBox extends events.EventEmitter {
  constructor(region, options = {}) {
    super();
    this.region = region;
    this.history = options.history || [];
    this.color = options.color || "#ccc";
    this.backgroundColor = options.backgroundColor || "black";
    this.maxLength = options.maxLength || DEFAULT_MAXLENGTH;
    this.reset();
    this.resize();
  }

  reset() {
    this.line = "";
    this.pos = 0;
    this.csiState = new CsiState();
    this.historyIndex = this.history.length;
    this.saved = "";
  }

  resize() {
    this.currentMaxLength = Math.min(this.maxLength, this.region.box.width * this.region.box.height);
    if (this.line.length > this.currentMaxLength) this.line = this.line.slice(0, this.currentMaxLength);
    if (this.pos > this.currentMaxLength) this.pos = this.currentMaxLength;
  }

  paint(options = {}) {
    this.region.canvas.color(this.color).backgroundColor(this.backgroundColor).clear().at(0, 0).write(this.line);
    return this.region.paint(options) + this.moveCursor();
  }

  moveCursor(pos) {
    if (pos != null) this.pos = pos;
    return this.region.moveTo(this.pos % this.region.box.width, Math.floor(this.pos / this.region.box.width));
  }

  handle(buffer) {
    let rv = "";
    for (let i = 0; i < buffer.length; i++) {
      const key = this.csiState.consume(buffer[i]);
      if (typeof key == "string") {
        rv += this.handleCsi(key);
      } else {
        rv += this.handleKey(key);
      }
    }
    return rv;
  }

  handleKey(key) {
    if (key >= SPACE && key < DELETE) return this.insert(String.fromCharCode(key));
    switch (key) {
      case CONTROL_A: return this.home();
      case CONTROL_B: return this.left();
      case CONTROL_D: return this.deleteForward();
      case CONTROL_E: return this.end();
      case CONTROL_F: return this.right();
      case CONTROL_H: return this.backspace();
      case CONTROL_J: return this.enter();
      case CONTROL_K: return this.deleteToEol();
      case CONTROL_M: return this.enter();
      case CONTROL_N: return this.down();
      case CONTROL_P: return this.up();
      case DELETE: return this.backspace();
      default: return "";
    }
  }

  handleCsi(command) {
    switch (command) {
      case "A": return this.up();
      case "B": return this.down();
      case "C": return this.right();
      case "D": return this.left();
      case "F": return this.end();
      case "H": return this.home();
      case "M-C": return this.wordRight();
      case "M-D": return this.wordLeft();
      case "~1": return this.home();
      case "~3": return this.deleteForward();
      case "~4": return this.end();
      case "~5": return ""; // page-up
      case "~6": return ""; // page-down
      // rus things: (control-arrows)
      case "1;5C": return this.wordRight();
      case "1;5D": return this.wordLeft();
    }

    // FIXME: once things are working, turn this into no-op "".
    return this.insert("<" + command + ">");
  }

  insert(text) {
    if (this.line.length == this.currentMaxLength) return "";
    this.line = this.line.slice(0, this.pos) + text + this.line.slice(this.pos);
    this.pos += text.length;
    if (this.line.length > this.currentMaxLength) {
      // truncate and redraw. boo.
      this.line = this.line.slice(0, this.currentMaxLength);
      if (this.pos > this.line.length) this.pos = this.line.length;
      return this.paint();
    }
    // when inserting in the middle, just redraw the whole thing.
    if (this.pos < this.line.length) return this.paint();
    return text;
  }

  backspace() {
    if (this.pos == 0) return "";
    this.pos -= 1;
    this.line = this.line.slice(0, this.pos) + this.line.slice(this.pos + 1);
    if (this.pos < this.line.length) return this.paint();
    return "\b \b";
  }

  deleteForward() {
    if (this.pos == this.line.length) return "";
    this.line = this.line.slice(0, this.pos) + this.line.slice(this.pos + 1);
    return this.paint();
  }

  enter() {
    this.recordHistory(this.line);
    const line = this.line;
    this.reset();
    this.emit("line", line);
    return this.paint();
  }

  up() {
    if (this.historyIndex == 0) return "";
    if (this.historyIndex == this.history.length) this.saved = this.line;
    this.historyIndex -= 1;
    this.line = this.history[this.historyIndex];
    this.pos = this.line.length;
    return this.paint();
  }

  down() {
    if (this.historyIndex == this.history.length) return "";
    this.historyIndex += 1;
    this.line = (this.historyIndex == this.history.length) ? this.saved : this.history[this.historyIndex];
    this.pos = this.line.length;
    return this.paint();
  }

  left() {
    if (this.pos == 0) return "";
    return this.moveCursor(this.pos - 1);
  }

  right() {
    if (this.pos >= this.line.length) return "";
    return this.moveCursor(this.pos + 1);
  }

  wordLeft() {
    let pos = this.pos;
    while (pos > 0 && !this.line[pos - 1].match(/[\w\d]/)) pos -= 1;
    while (pos > 0 && this.line[pos - 1].match(/[\w\d]/)) pos -= 1;
    return this.moveCursor(pos);
  }

  wordRight() {
    let pos = this.pos;
    while (pos < this.line.length && !this.line[pos].match(/[\w\d]/)) pos += 1;
    while (pos < this.line.length && this.line[pos].match(/[\w\d]/)) pos += 1;
    return this.moveCursor(pos);
  }

  home() {
    return this.moveCursor(0);
  }

  end() {
    return this.moveCursor(this.line.length);
  }

  deleteToEol() {
    if (this.pos == this.line.length) return "";
    this.line = this.line.slice(0, this.pos);
    return this.paint();
  }

  recordHistory(line) {
    // remove any redundant copy of this line from the history.
    const i = this.history.indexOf(line);
    if (i >= 0) this.history.splice(i, 1);
    this.history.push(line);
    if (this.history.length > this.maxHistory) this.history = this.history.slice(this.history.length - this.maxHistory);
  }
}


exports.EditBox = EditBox;
