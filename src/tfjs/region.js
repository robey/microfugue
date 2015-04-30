"use strict";

const antsy = require("antsy");
const util = require("util");

const CSI = "\u001b[";

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

  moveTo(x, y) {
    if (x < 0 || x >= this.box.width || y < 0 || y >= this.box.height) return "";
    return `${CSI}${this.box.top + y + 1};${this.box.left + x + 1}H`;
  }

  paint() {
    let out = "";
    let y = 0;
    this.canvas.toStrings().forEach((line) => {
      out += this.moveTo(0, y) + line;
      y += 1;
    });
    return out;
  }

  resize(box) {
    this.box = box;
    this.canvas = new antsy.Canvas(box.width, box.height);
  }

  subRegions() {
    return [ this ];
  }

  /*
   * Split into two, vertically, giving the top region `ratio` of the size.
   * (0.5 = half and half, 0.25 = top region is 1/4, bottom is 3/4)
   * Returns [ topRegion, bottomRegion ].
   */
  vsplit(ratio) {
    return this._splitBy("vsplit", ratio);
  }

  /*
   * Split into two, vertically, giving the top region exactly N lines.
   */
  splitTop(n) {
    return this._splitBy("splitTop", n);
  }

  /*
   * Split into two, vertically, giving the bottom region exactly N lines.
   */
  splitBottom(n) {
    return this._splitBy("splitBottom", n);
  }

  /*
   * Split into two, horizontally, giving the left region `ratio` of the size.
   * (0.5 = half and half, 0.25 = left region is 1/4, right is 3/4)
   * Returns [ leftRegion, rightRegion ].
   */
  hsplit(ratio) {
    return this._splitBy("hsplit", ratio);
  }

  /*
   * Split into two, vertically, giving the top region exactly N lines.
   */
  splitLeft(n) {
    return this._splitBy("splitLeft", n);
  }

  /*
   * Split into two, vertically, giving the bottom region exactly N lines.
   */
  splitRight(n) {
    return this._splitBy("splitRight", n);
  }

  _splitBy(splitter, metric) {
    const container = require("./container");
    const r = new container.Container(this.box, 2, splitter, metric);
    this.parent._replace(this, r);
    return r._regions;
  }

  /*
   * Tell the parent container to use a new split function for resizing.
   * - metric: metric to pass to the splitter
   * - splitter: name of the function on Box to call to split the container box
   *   (null leaves the old splitter alone)
   */
  changeSiblingSplit(metric, splitter) {
    this.parent._changeSplit(metric, splitter);
  }
}


exports.Region = Region;
