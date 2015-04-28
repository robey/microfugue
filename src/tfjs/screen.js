"use strict";

const box = require("./box");
const container = require("./container");
const region = require("./region");
const util = require("util");
const _ = require("lodash");

require("source-map-support").install();

const CSI = "\u001b[";


/*
 * The screen is made up of non-overlapping regions. It begins as a single
 * region the size of the screen, but may be split horizontally or recursively.
 * (Each resulting region may also be recursively split.)
 *
 * - width: defaults to the TTY width, or 80 if there isn't a TTY
 * - height: defualts to the TTY height, or 24 if there isn't a TTY
 */
class Screen extends container.Container {
  constructor(width, height) {
    if (width === undefined) width = process.stdout.columns || 80;
    if (height === undefined) height = process.stdout.height || 24;
    super(new box.Box(0, 0, width, height), 1);
  }

  toString() {
    return "Screen(" + this.region.toString() + ")";
  }

  paint() {
    return `${CSI}2J` + this.region.paint();
  }

  resize(box) {
    this.region.resize(box);
  }

  /*
   * The region covering this screen. It may be a container for recursively
   * split regions, so it may not have a canvas.
   */
  get region() { return this._regions[0]; }

  /*
   * Return a list of nested Region objects, in a predictable order.
   */
  get regions() { return this.region.subRegions(); }

  // copies of the region splitters:
  vsplit(ratio) { return this.region.vsplit(ratio); }
  splitTop(n) { return this.region.splitTop(n); }
  splitBottom(n) { return this.region.splitBottom(n); }
  hsplit(ratio) { return this.region.hsplit(ratio); }
  splitLeft(n) { return this.region.splitLeft(n); }
  splitRight(n) { return this.region.splitRight(n); }
}




// -----


function main() {
  const screen = newScreen();
  const [ r1, r2 ] = screen.splitBottom(3);
  r1.canvas.backgroundColor("red").clear();
  r2.canvas.backgroundColor("blue").clear();
  process.on("SIGWINCH", () => {
    screen.resize(new box.Box(0, 0, process.stdout.columns, process.stdout.rows));
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
exports.Screen = Screen;
