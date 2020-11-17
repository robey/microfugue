import { Canvas, Region } from "antsy";
import { RichText } from "./rich_text";

export interface LogViewConfig {
  maxLines: number;
  wordWrap: boolean;
  defaultColor: string;
  colorAliases?: Map<string, string>;
}

const DEFAULT_CONFIG: LogViewConfig = {
  maxLines: 100,
  wordWrap: true,
  defaultColor: "aaa",  // vga white
};

export interface ContentPositionListener {
  contentMoved(lines: number): void;
}

// fill a canvas with lines of text, optionally wrapping them.
export class LogView {
  config: LogViewConfig;
  cols!: number;
  lines: RichText[] = [];
  // cache:
  wrappedLines: RichText[][] = [];

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
    this.wrappedLines = this.lines.map(line => line.wrap(this.cols - 1, this.config.wordWrap));
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
    this.addText(RichText.string(this.config.defaultColor, line));
  }

  addText(text: RichText) {
    this.lines.push(text);
    this.wrappedLines.push(text.wrap(this.canvas.cols - 1, this.config.wordWrap));
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
    const allLines: RichText[] = ([] as RichText[]).concat(...this.wrappedLines);
    this.canvas.resize(this.canvas.cols, allLines.length);
    const region = this.canvas.all();
    allLines.forEach((line, i) => {
      region.at(0, i).clearToEndOfLine();
      line.render(region, this.config.colorAliases);
    });
  }
}


// returns line # and # of rows within the line
function rowToLine(wrappedLines: RichText[][], row: number): [ number, number ] {
  let i = 0, rows = 0;
  while (i < wrappedLines.length) {
    if (rows + wrappedLines[i].length > row) break;
    rows += wrappedLines[i].length;
    i++;
  }
  return [ i, row - rows ];
}

function lineToRow(wrappedLines: RichText[][], line: number): number {
  return wrappedLines.slice(0, Math.max(line - 1, 0)).reduce((sum, list) => sum + list.length, 0);
}
