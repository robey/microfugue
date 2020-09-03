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

    // content must always be as wide as the frame, and at least as tall
    region.onResize(() => {
      this.content.resize(region.cols - 1, Math.max(region.rows, this.content.rows));
    });

    // when the canvas is updated, the view must be too
    this.content.onDirty(0, () => this.redraw());
  }

  get frameBottom(): number {
    return this.frameTop + this.bar.rows;
  }

  redraw() {
    this.drawScrollBar();
  }

  drawScrollBar() {
    if (this.frameTop == 0 && this.frameBottom == this.content.rows) {
      // no scrollbar
      this.bar.color(this.trackColor, this.backgroundColor);
      for (let y = 0; y < this.bar.rows; y++) this.bar.at(0, y).write(" ");
      return;
    }

    const grabbyTop = Math.round(this.bar.rows * this.frameTop / this.content.rows);
    const grabbyBottom = Math.round(this.bar.rows * this.frameBottom / this.content.rows);
    if (grabbyTop == 0 && grabbyBottom)

    this.bar.color(this.trackColor, this.backgroundColor);
    for (let y = 0; y < this.bar.rows; y++) this.bar.at(0, y).write(TRACK);
    this.bar.color(this.barColor);
    for (let y = grabbyTop; y < grabbyBottom; y++) this.bar.at(0, y).write(BAR);
  }
}