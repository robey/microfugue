import { Canvas } from "antsy";
import { ScrollView } from "../tfjs/scroll_view";

import "should";
import "source-map-support/register";

const escpaint = (c: Canvas): string => c.paint().replace(/\u001b\[/g, "[");

describe("ScrollView", () => {
  it("hides", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), "red", "white", "black");
    sv.content.resize(19, 10);
    sv.redraw();

    // everything should be on display, and no scrollbar
    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    escpaint(canvas).should.eql("[37m[40m[2J[H");
  });

  it("pushes small content to the bottom", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), "red", "white", "black");
    sv.content.resize(19, 1);
    sv.content.all().at(0, 0).color("white").write("hello");
    sv.redraw();

    // everything should be on display, and no scrollbar
    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    escpaint(canvas).should.eql("[37m[40m[2J[H[9B[38;5;15mhello[H");
  });

  it("correctly draws the scrollbar", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), "red", "white", "black");
    sv.content.resize(19, 20);
    sv.content.all().at(0, 0).color("white").write("hello");
    sv.content.all().at(0, 19).color("white").write("goodbye");

    // show bottom only, with scrollbar visible
    sv.redraw();
    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    escpaint(canvas).should.eql("[37m[40m[2J[H[38;5;15mhello[14C█[2;20H█[3;20H█[4;20H█[5;20H█[6;20H[38;5;9m│[7;20H│[8;20H│[9;20H│[10;20H│[H");

    sv.scrollDown(2);
    sv.frameTop.should.eql(2);
    sv.frameBottom.should.eql(12);
    // clear top line and move scroll bar down one cell.
    escpaint(canvas).should.eql("[37m[K[19C[38;5;9m│[6;20H[38;5;15m█[H");

    sv.scrollDown(8);
    sv.frameTop.should.eql(10);
    sv.frameBottom.should.eql(20);
    // move scroll bar to the bottom and show the final line.
    escpaint(canvas).should.eql("[2;20H[38;5;9m│[3;20H│[4;20H│[5;20H│[7;20H[38;5;15m█[8;20H█[9;20H█[10Hgoodbye[12C█[H");
  });

  it("page up/down", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), "red", "white", "black");
    sv.content.resize(19, 25);

    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    sv.visiblePercent.should.eql(40);
    sv.pageDown();
    sv.frameTop.should.eql(9);
    sv.frameBottom.should.eql(19);
    sv.visiblePercent.should.eql(76);
    sv.pageDown();
    sv.frameTop.should.eql(15);
    sv.frameBottom.should.eql(25);
    sv.visiblePercent.should.eql(100);
    sv.scrollUp();
    sv.frameTop.should.eql(14);
    sv.frameBottom.should.eql(24);
    sv.visiblePercent.should.eql(96);
    sv.pageUp();
    sv.frameTop.should.eql(5);
    sv.frameBottom.should.eql(15);
    sv.visiblePercent.should.eql(60);
    sv.pageUp();
    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    sv.visiblePercent.should.eql(40);
  });
});


// does it add things to the bottom, no the top
