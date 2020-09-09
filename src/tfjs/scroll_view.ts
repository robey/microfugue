import { Canvas, GridLayout, Region } from "antsy";

const TRACK = "\u2502";
const BAR = "\u2588";

// turn a region into a scrolling frame that views part of a taller (in rows)
// canvas
export class ScrollView {
  content: Canvas;
  frame: Region;
  bar: Region;
  frameTop = 0;
  pinnedToBottom = true;

  constructor(region: Region, public trackColor: string, public barColor: string, public backgroundColor: string) {
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
    if (this.pinnedToBottom) this.frameTop = Math.max(0, this.content.rows - this.frame.rows);
    this.drawScrollBar();
    const y = Math.max(this.frame.rows - this.content.rows, 0);
    this.frame.at(0, y).draw(this.content.clip(0, this.frameTop, this.frame.cols, this.frameBottom));
  }

  drawScrollBar() {
    if (this.frameTop == 0 && this.frameBottom >= this.content.rows) {
      // no scrollbar
      this.bar.color(this.trackColor, this.backgroundColor);
      for (let y = 0; y < this.bar.rows; y++) this.bar.at(0, y).write(" ");
      return;
    }

    const grabbyTop = Math.round(this.bar.rows * this.frameTop / this.content.rows);
    const grabbyBottom = Math.round(this.bar.rows * this.frameBottom / this.content.rows);

    this.bar.color(this.trackColor, this.backgroundColor);
    for (let y = 0; y < this.bar.rows; y++) this.bar.at(0, y).write(TRACK);
    this.bar.color(this.barColor);
    for (let y = grabbyTop; y < grabbyBottom; y++) this.bar.at(0, y).write(BAR);
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

  // the owner of the content canvas can hint to us when the content is
  // moving (probably because old lines at the top are expiring)
  adjustView(translate: (row: number) => number) {
    if (this.pinnedToBottom) return;
    this.frameTop = Math.max(0, Math.min(translate(this.frameTop), this.content.rows - this.frame.rows));
    this.pinnedToBottom = (this.frameBottom == this.content.rows);
    this.redraw();
  }
}
