"use strict";

const region = require("./region");
const _ = require("lodash");

/*
 * Virtual Region that's really a container for several.
 * It has an overall Box that covers all of the sub-regions.
 */
class Container {
  constructor(box, count = 0) {
    this._regions = [];
    for (let i = 0; i < count; i++) {
      this._regions.push(new region.Region(this, box));
    }
  }

  toString() {
    return "Container([" + this._regions.map((r) => r.toString()).join(", ") + "])";
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

  subRegions() {
    return Array.concat.apply([], this._regions.map((r) => r.subRegions()));
  }

  _replace(region, newRegion) {
    for (let i = 0; i < this._regions.length; i++) {
      if (this._regions[i].id == region.id) this._regions.splice(i, 1);
    }
    this._regions.push(newRegion);
  }
}


exports.Container = Container;
