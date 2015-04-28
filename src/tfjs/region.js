"use strict";

const antsy = require("antsy");
const util = require("util");

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

  subRegions() {
    return [ this ];
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

  /*
   * Split into two, horizontally, giving the left region `ratio` of the size.
   * (0.5 = half and half, 0.25 = left region is 1/4, right is 3/4)
   * Returns [ leftRegion, rightRegion ].
   */
  hsplit(ratio) {
    return this._splitBy((newBox) => newBox.hsplit(ratio));
  }

  /*
   * Split into two, vertically, giving the top region exactly N lines.
   */
  splitLeft(n) {
    return this._splitBy((newBox) => newBox.splitLeft(n));
  }

  /*
   * Split into two, vertically, giving the bottom region exactly N lines.
   */
  splitRight(n) {
    return this._splitBy((newBox) => newBox.splitRight(n));
  }

  _splitBy(f) {
    const container = require("./container");
    const r = new container.Container(this.box, 2);
    r._resize = f;
    r.resize(this.box);
    this.parent._replace(this, r);
    return r._regions;
  }
}


exports.Region = Region;
