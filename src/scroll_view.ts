import { Canvas, GridLayout, Region } from "antsy";

const TRACK = "\u2502";
const BAR = "\u2588";

export interface ScrollViewConfig {
  trackColor: string;
  barColor: string;
  backgroundColor: string;

  // in case you want to customize the chars used to draw the scrollbar:
  trackChar: string;
  barChar: string;

  // hide the scrollbar when it's not needed?
  autoHide: boolean;

  // if the content is smaller than the frame, push it to the top?
  gravityIsTop: boolean;
}

const DEFAULT_CONFIG: ScrollViewConfig = {
  trackColor: "777",
  barColor: "777",
  backgroundColor: "000",
  trackChar: TRACK,
  barChar: BAR,
  autoHide: true,
  gravityIsTop: false,
};

// turn a region into a scrolling frame that views part of a taller (in rows)
// canvas
export class ScrollView {
  config: ScrollViewConfig;
  content: Canvas;
  frame: Region;
  bar: Region;
  frameTop = 0;
  pinnedToBottom = true;
  anchor?: number;

  constructor(region: Region, options: Partial<ScrollViewConfig>) {
    this.config = Object.assign({}, DEFAULT_CONFIG, options);
    this.content = new Canvas(region.cols - 1, region.rows);
    const grid = new GridLayout(
      region,
      [ GridLayout.stretch(1), GridLayout.fixed(1) ],
      [ GridLayout.stretch(1) ]
    );
    this.frame = grid.layoutAt(0, 0);
    this.bar = grid.layoutAt(1, 0);
    this.frameTop = 0;

    // content must always be as wide as the frame
    region.onResize(() => {
      this.content.resize(region.cols - 1, this.content.rows);
      this.redraw();
    });

    // when the canvas is updated, the view must be too
    this.content.onDirty(0, () => this.redraw());
    this.content.all().onResize(() => this.redraw());
  }

  get frameBottom(): number {
    return this.frameTop + this.bar.rows;
  }

  get visiblePercent(): number {
    return Math.min(Math.floor(100 * this.frameBottom / this.content.rows), 100);
  }

  redraw() {
    this.frame.clear();
    if (this.pinnedToBottom) {
      this.frameTop = Math.max(0, this.content.rows - this.frame.rows);
      if (this.anchor !== undefined && this.frameTop > this.anchor) {
        // stop pinning, and hold the anchor on screen.
        this.pinnedToBottom = false;
        this.frameTop = this.anchor;
        this.anchor = undefined;
      }
    }
    this.drawScrollBar();
    const y = Math.max(this.frame.rows - this.content.rows, 0);
    if (y > 0 && this.config.gravityIsTop) {
      this.frameTop = -y;
      this.frame.at(0, 0).draw(this.content.clip(0, 0, this.frame.cols, this.frameBottom));
    } else {
      this.frame.at(0, y).draw(this.content.clip(0, this.frameTop, this.frame.cols, this.frameBottom));
    }
  }

  drawScrollBar() {
    if (this.frameTop == 0 && this.frameBottom >= this.content.rows) {
      // no scrollbar
      this.bar.color(this.config.trackColor, this.config.backgroundColor);
      const ch = this.config.autoHide ? " " : this.config.trackChar;
      for (let y = 0; y < this.bar.rows; y++) this.bar.at(0, y).write(ch);
      return;
    }

    const grabbyTop = Math.round(this.bar.rows * this.frameTop / this.content.rows);
    const grabbyBottom = Math.round(this.bar.rows * this.frameBottom / this.content.rows);

    this.bar.color(this.config.trackColor, this.config.backgroundColor);
    for (let y = 0; y < this.bar.rows; y++) this.bar.at(0, y).write(this.config.trackChar);
    this.bar.color(this.config.barColor);
    for (let y = grabbyTop; y < grabbyBottom; y++) this.bar.at(0, y).write(this.config.barChar);
  }

  scrollUp(count: number = 1) {
    if (this.frameTop == 0) return;
    this.frameTop = Math.max(0, this.frameTop - count);
    this.pinnedToBottom = (this.frameBottom == this.content.rows);
    this.redraw();
  }

  scrollDown(count: number = 1) {
    if (this.frameBottom == this.content.rows) return;
    this.frameTop = Math.max(0, Math.min(this.frameTop + count, this.content.rows - this.frame.rows));
    this.pinnedToBottom = (this.frameBottom == this.content.rows);
    this.redraw();
  }

  pageUp() {
    if (this.frameTop == 0) return;
    this.frameTop = Math.max(0, this.frameTop - this.frame.rows + 1);
    this.pinnedToBottom = (this.frameBottom == this.content.rows);
    this.redraw();
  }

  pageDown() {
    if (this.frameBottom == this.content.rows) return;
    this.frameTop = Math.max(0, Math.min(this.frameTop + this.frame.rows - 1, this.content.rows - this.frame.rows));
    this.pinnedToBottom = (this.frameBottom == this.content.rows);
    this.redraw();
  }

  jumpToBottom() {
    this.pinnedToBottom = true;
    this.redraw();
  }

  // hold scroll view where it is, even as new lines are added.
  // can be used to implement paging.
  unpin() {
    this.pinnedToBottom = false;
  }

  isPinned(): boolean {
    return this.pinnedToBottom;
  }

  setAnchor(line?: number) {
    if (line !== undefined && line < 0) {
      this.anchor = Math.max(0, Math.min(this.frameBottom, this.frameTop + this.content.rows) + line);
    } else {
      this.anchor = line;
    }
  }

  // the owner of the content canvas can hint to us when the content is
  // moving (probably because old lines at the top are expiring)
  adjustView(translate: (row: number) => number) {
    if (this.pinnedToBottom) return;
    this.frameTop = Math.max(0, Math.min(translate(this.frameTop), this.content.rows - this.frame.rows));
    this.pinnedToBottom = (this.frameBottom == this.content.rows);
    this.redraw();
  }

  // if the cursor in the canvas is in view, move it to the same place in our view
  setCursor() {
    const [ x, y ] = this.content.cursor;
    if (y >= this.frameTop && y < this.frameBottom) {
      this.frame.moveCursor(x, y - Math.max(this.frameTop, 0));
    }
  }
}
