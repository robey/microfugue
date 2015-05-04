"use strict";

const region = require("./region");
const _ = require("lodash");

/*
 * Virtual Region that's really a container for several.
 * It has an overall Box that covers all of the sub-regions.
 */
class Container {
  constructor(box, count = 0, splitter, metric) {
    this._regions = [];
    this._splitter = splitter;
    this._metric = metric;
    for (let i = 0; i < count; i++) {
      this._regions.push(new region.Region(this, box));
    }
    this.resize(box);
  }

  toString() {
    return "Container([" + this._regions.map((r) => r.toString()).join(", ") + "])";
  }

  paint() {
    return this._regions.map((r) => r.paint()).join("");
  }

  resize(box) {
    this._box = box;
    if (this._regions.length == 0) return;
    if (this._regions.length == 1) return this._regions[0].resize(box);
    const newBoxes = box[this._splitter](this._metric, this._regions.length);
    _.zip(this._regions, newBoxes).map(([ region, newBox ]) => region.resize(newBox));
  }

  subRegions() {
    return [].concat.apply([], this._regions.map((r) => r.subRegions()));
  }

  _replace(region, newRegion) {
    for (let i = 0; i < this._regions.length; i++) {
      if (this._regions[i].id == region.id) {
        this._regions[i] = newRegion;
        return;
      }
    }
    this._regions.push(newRegion);
  }

  /*
   * Change or set the split function used for resizing.
   * - metric: the parameter passed to the split function
   * - splitter: name of a function on `Box` called with `(metric, regionCount)`
   *   where `regionCount` is the number of desired regions (all built-in
   *   splitters ignore this and create only two regions) -- if null, use the
   *   splitter previously configured
   */
  _changeSplit(metric, splitter) {
    this._metric = metric;
    if (splitter) this._splitter = splitter;
    this.resize(this._box);
  }
}


exports.Container = Container;
