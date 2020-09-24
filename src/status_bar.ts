import { Region } from "antsy";

// inherently one line tall
export class StatusBar {
  left: string = "";
  right: string = "";

  constructor(public region: Region, public fgColor: string, public bgColor: string) {
    region.onResize(() => this.redraw());
  }

  computeLine(): string {
    let left = this.left;
    let right = this.right;
    let padding = this.region.cols - (left.length + right.length + 2);
    if (padding <= 1) {
      // truncate left with "..."?
      const leftLen = left.length + (padding - 5);
      if (leftLen < 2) {
        // skip left completely
        left = "";
        padding = 0;
        // truncate right with "..."?
        if (right.length > this.region.cols - 2) {
          const rightLen = this.region.cols - 5;
          right = "..." + right.slice(right.length - rightLen);
        }
      } else {
        left = left.slice(0, leftLen) + "...";
        padding = 2;
      }
    }
    return " " + left + pad(" ", padding) + right + " ";
  }

  redraw() {
    this.region.at(0, 0).color(this.fgColor, this.bgColor).write(this.computeLine());
  }
}

function pad(s: string, n: number): string {
  while (s.length < n) s += "        ";
  return s.slice(0, n);
}
