"use strict";

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

  hsplit(ratio) {
    return this.splitLeft(Math.round(this.width * ratio));
  }

  splitLeft(n) {
    const firstWidth = n <= this.width ? n : this.width;
    return [
      new Box(this.left, this.top, this.left + firstWidth, this.bottom),
      new Box(this.left + firstWidth, this.top, this.right, this.bottom)
    ]
  }

  splitRight(n) {
    return this.splitLeft(this.width - n);
  }
}


exports.Box = Box;
