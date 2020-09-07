import { Canvas } from "antsy";

export interface LogViewConfig {
  maxLines: number;
  wordWrap: boolean;
}

const DEFAULT_CONFIG: LogViewConfig = {
  maxLines: 100,
  wordWrap: true,
};

export interface ContentPositionListener {
  contentMoved(lines: number): void;
}

// fill a canvas with lines of text, optionally wrapping them.
export class LogView {
  config: LogViewConfig;
  cols!: number;
  lines: string[] = [];
  // cache:
  wrappedLines: string[][] = [];

  // we can indicate to something like a ScrollView (hint hint) when
  // the content has lost lines from the top or added some to the bottom:
  contentMovedListener?: (translate: (row: number) => number) => void;

  constructor(public canvas: Canvas, options: Partial<LogViewConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_CONFIG, options);
    canvas.all().onResize(() => {
      // are we just being informed of our own height change?
      if (this.cols == canvas.cols) return;
      // crap, throw away the cache of line wrapping
      this.reflow();
    });
    this.reflow();
  }

  onContentMoved(f: (translate: (row: number) => number) => void) {
    this.contentMovedListener = f;
  }

  reflow() {
    this.cols = this.canvas.cols;
    const oldWrappedLines = this.wrappedLines;
    this.wrappedLines = this.lines.map(line => wrapText(line, this.cols, this.config.wordWrap));
    if (this.contentMovedListener && oldWrappedLines) {
      this.contentMovedListener(row => {
        // ignore the offset, because we had to reflow the text.
        let [ i, _ ] = rowToLine(oldWrappedLines, row);
        return lineToRow(this.wrappedLines, i);
      });
    }
    this.redraw();
  }

  add(line: string) {
    this.lines.push(line);
    this.wrappedLines.push(wrapText(line, this.canvas.cols, this.config.wordWrap));
    if (this.lines.length > this.config.maxLines) {
      this.lines.shift();
      const discarded = this.wrappedLines.shift();
      if (this.contentMovedListener && discarded) {
        this.contentMovedListener(row => Math.max(0, row - discarded.length));
      }
    }
    this.redraw();
  }

  redraw() {
    const allLines: string[] = ([] as string[]).concat(...this.wrappedLines);
    this.canvas.resize(this.canvas.cols, allLines.length);
    allLines.forEach((line, i) => this.canvas.all().at(0, i).clearToEndOfLine().write(line));
  }
}


export function wrapText(text: string, width: number, wordWrap: boolean = true): string[] {
  const rv: string[] = [];
  while (text.length > width) {
    let i = width;
    while (wordWrap && i > 0 && text[i - 1] != " " && text[i - 1] != "-") i--;
    if (i == 0) {
      // give up.
      rv.push(text.slice(0, width - 1) + "-");
      text = text.slice(width - 1);
    } else {
      rv.push(text.slice(0, i));
      text = text.slice(i);
    }
  }
  if (text.length > 0) rv.push(text);
  return rv;
}

// returns line # and # of rows within the line
function rowToLine(wrappedLines: string[][], row: number): [ number, number ] {
  let i = 0, rows = 0;
  while (i < wrappedLines.length) {
    if (rows + wrappedLines[i].length > row) break;
    rows += wrappedLines[i].length;
    i++;
  }
  return [ i, row - rows ];
}

function lineToRow(wrappedLines: string[][], line: number): number {
  return wrappedLines.slice(0, Math.max(line - 1, 0)).reduce((sum, list) => sum + list.length, 0);
}
