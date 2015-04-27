"use strict";

const antsy = require("antsy");
const util = require("util");
const _ = require("lodash");

require("source-map-support");

const CSI = "\u001b[";


/*
 * The screen is made up of non-overlapping regions. It begins as a single
 * region the size of the screen, but may be split horizontally or recursively.
 * (Each resulting region may also be recursively split.)
 *
 * - width: defaults to the TTY width, or 80 if there isn't a TTY
 * - height: defualts to the TTY height, or 24 if there isn't a TTY
 */
class Screen extends Container {
  constructor(width, height) {
    if (width === undefined) width = process.stdout.columns || 80;
    if (height === undefined) height = process.stdout.height || 24;
    super(new Box(0, 0, width, height), 1);
  }

  toString() {
    return "Screen(" + this.region.toString() + ")";
  }

  /*
   * The region covering this screen. It may be a container for recursively
   * split regions, so it may not have a canvas.
   */
  get region() { return this._regions[0]; }

  /*
   * Return a list of nested Region objects, in a predictable order.
   */



  vsplit(ratio) { return this.region.vsplit(ratio); }
  splitTop(n) { return this.region.splitTop(n); }
  splitBottom(n) { return this.region.splitBottom(n); }

  paint() {
    return `${CSI}2J` + this.region.paint();
  }
}


/*
 * Virtual Region that's really a container for several.
 * It has an overall Box that covers all of the sub-regions.
 */
class Container {
  constructor(box, count = 0) {
    this._regions = [];
    for (let i = 0; i < count; i++) {
      this._regions.push(new Region(this, box));
    }
  }

  toString() {
    return "Container([" + this._regions.map((r) => r.toString()).join(", ") + "])";
  }

  _replace(region, newRegion) {
    for (let i = 0; i < this._regions.length; i++) {
      if (this._regions[i].id == region.id) this._regions.splice(i, 1);
    }
    this._regions.push(newRegion);
  }

  paint() {
    return this._regions.map((r) => r.paint()).join("");
  }

  resize(box) {
    if (this._regions.length == 0) return;
    if (this._regions.length == 1) return this._regions[0].resize(box);
    const newBoxes = this._resize(box, this._regions.length);
    _.zip(this._regions, newBoxes).map(([ region, newBox ]) => region.resize(newBox));
  }

    // const newWidth = right - left;
    // const newHeight = bottom - top;
    // const widths = this.widthSolver(this.regions);
    // const heights = this.heightSolver(this.regions);
    //
    // const [ firstWidth, firstHeight, lastWidth, lastHeight ] = this.constraint();
    // this.regions[0].resize(left, top, left + firstWidth, top + firstHeight);
    // const lastLeft = left + firstWidth;
    // const lastTop = top + firstHeight;
    // this.regions[1].resize(lastLeft, lastLeft + lastWidth, lastTop, lastTop + lastHeight);
}



let RegionId = 1;

/*
 * Canvas container that can be resized and painted.
 * Always belongs to a Container.
 */
class Region {
  constructor(parent, box) {
    this.parent = parent;
    this.resize(box);
    this.id = RegionId;
    RegionId += 1;
  }

  toString() {
    return `Region(${this.id}, ${this.box})`;
  }

  paint() {
    let out = "";
    let y = this.box.top;
    this.canvas.toStrings().forEach((line) => {
      out += `${CSI}${y + 1};${this.box.left + 1}H`;
      out += line;
      y += 1;
    });
    return out;
  }

  resize(box) {
    this.box = box;
    this.canvas = new antsy.Canvas(box.width, box.height);
  }

  /*
   * Split into two, vertically, giving the top region `ratio` of the size.
   * (0.5 = half and half, 0.25 = top region is 1/4, bottom is 3/4)
   * Returns [ topRegion, bottomRegion ].
   */
  vsplit(ratio) {
    return this._splitBy((newBox) => newBox.vsplit(ratio));
  }

  /*
   * Split into two, vertically, giving the top region exactly N lines.
   */
  splitTop(n) {
    return this._splitBy((newBox) => newBox.splitTop(n));
  }

  /*
   * Split into two, vertically, giving the bottom region exactly N lines.
   */
  splitBottom(n) {
    return this._splitBy((newBox) => newBox.splitBottom(n));
  }

  _splitBy(f) {
    const r = new Container(this.box, 2);
    r._resize = f;
    r.resize(this.box);
    this.parent._replace(this, r);
    return r.regions;
  }
}


/*
 * Data type for a box shape.
 * Left & top are inclusive; right & bottom are exclusive.
 */
class Box {
  constructor(left, top, right, bottom) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }

  toString() {
    return `Box(left=${this.left} top=${this.top} right=${this.right} bottom=${this.bottom})`;
  }

  get width() { return this.right - this.left; }
  get height() { return this.bottom - this.top; }

  vsplit(ratio) {
    return this.splitTop(Math.round(this.height * ratio));
  }

  splitTop(n) {
    const firstHeight = n <= this.height ? n : this.height;
    return [
      new Box(this.left, this.top, this.right, this.top + firstHeight),
      new Box(this.left, this.top + firstHeight, this.right, this.bottom)
    ]
  }

  splitBottom(n) {
    return this.splitTop(this.height - n);
  }
}


// -----


function main() {
  const screen = newScreen();
  const [ r1, r2 ] = screen.splitBottom(3);
  r1.canvas.backgroundColor("red").clear();
  r2.canvas.backgroundColor("blue").clear();
  process.on("SIGWINCH", () => {
    screen.resize(new Box(0, 0, process.stdout.columns, process.stdout.rows));
    r1.canvas.backgroundColor("red").clear();
    r2.canvas.backgroundColor("blue").clear();
  });

  function loop() {
    console.log(screen.toString());
    process.stdout.write(screen.paint());
    setTimeout(() => loop(), 1000);
  }
  loop();
}

function main2() {
  const screen = newScreen({ width: 76, height: 22 });
  screen.regions[0].canvas.backgroundColor("#066").clear();
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(Math.random() * 50) + 10;
    const y = Math.floor(Math.random() * 15) + 3;
    const c = Math.floor(Math.random() * 16).toString(16);
    screen.regions[0].canvas.color(`#f${c}0`).at(x, y).write("WAH!");
  }
  screen.regions[0].canvas.backgroundColor("#066");

  process.stdout.write(screen.paint());
  setTimeout(() => rando(), 100);

  function rando() {
    const x = Math.floor(Math.random() * 3) - 1;
    const y = Math.floor(Math.random() * 3) - 1;
    const start = Date.now();
    for (let i = 0; i < 5000; i++) {
      screen.regions[0].canvas.scroll(1, 1);
      process.stdout.write(screen.paint());
      screen.regions[0].canvas.scroll(-1, -1);
      process.stdout.write(screen.paint());
    }
//    screen.regions[0].canvas.scroll(x, y);
    const time = Date.now() - start;
    screen.regions[0].canvas.at(0, 0).write(time.toString() + "   ");
    process.stdout.write(screen.paint());
    setTimeout(() => rando(), 100);
  }
}


exports.main = main;
exports.Region = Region;
exports.newScreen = newScreen;
exports.Screen = Screen;
exports.Box = Box;
