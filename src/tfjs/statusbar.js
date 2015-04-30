"use strict";

// StatusBar is one line tall
class StatusBar {
  constructor(region, fgColor, bgColor) {
    this.region = region;
    this.fgColor = fgColor;
    this.bgColor = bgColor;
    this.left = "";
    this.right = "";
  }

  computeLine() {
    let left = this.left;
    let right = this.right;
    let padding = this.region.box.width - (this.left.length + this.right.length + 2);
    if (padding <= 1) {
      // truncate left with "..."?
      const leftLen = this.left.length + (padding - 5);
      if (leftLen < 2) {
        // skip left completely
        left = "";
        padding = 0;
        // truncate right with "..."?
        if (this.right.length > this.region.box.width - 2) {
          const rightLen = this.region.box.width - 5;
          right = "..." + this.right.slice(this.right.length - rightLen);
        }
      } else {
        left = this.left.slice(0, leftLen) + "...";
        padding = 2;
      }
    }
    return " " + left + pad(" ", padding) + right + " ";
  }

  redraw() {
    this.region.canvas.at(0, 0).color(this.fgColor).backgroundColor(this.bgColor).write(this.computeLine());
    return this.region.paint();
  }
}

function pad(s, n) {
  while (s.length < n) s += "        ";
  return s.slice(0, n);
}


exports.StatusBar = StatusBar;
