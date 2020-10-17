import "should";
import { Canvas } from "antsy";
import { ScrollView } from "../src";
import { ScrollViewConfig } from "../src/scroll_view";

const escpaint = (c: Canvas): string => c.paint().replace(/\u001b\[/g, "[");
const STANDARD_OPTIONS: Partial<ScrollViewConfig> = { backgroundColor: "black", trackColor: "red", barColor: "white" };

describe("ScrollView", () => {
  it("hides", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), STANDARD_OPTIONS);
    sv.content.resize(19, 10);
    sv.redraw();

    // everything should be on display, and no scrollbar
    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    escpaint(canvas).should.eql("[37m[40m[2J[H");
  });

  it("doesn't hide", () => {
    const canvas = new Canvas(20, 5);
    const sv = new ScrollView(canvas.all(), Object.assign({}, STANDARD_OPTIONS, { autoHide: false }));
    sv.content.resize(19, 5);
    sv.redraw();

    // everything should be on display, and one empty track
    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(5);
    escpaint(canvas).should.eql("[37m[40m[2J[H[19C[38;5;9m│[2;20H│[3;20H│[4;20H│[5;20H│[H");
  });

  it("pushes small content to the bottom", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), STANDARD_OPTIONS);
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
    const sv = new ScrollView(canvas.all(), STANDARD_OPTIONS);
    sv.content.resize(19, 20);
    sv.content.all().at(0, 0).color("white").write("hello");
    sv.content.all().at(0, 19).color("white").write("goodbye");
    sv.scrollUp(20);

    // show top only, with scrollbar visible
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
    const sv = new ScrollView(canvas.all(), STANDARD_OPTIONS);
    sv.content.resize(19, 25);
    sv.scrollUp(100);

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

  it("ignores scrolling when the content view is smaller than the frame", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), STANDARD_OPTIONS);
    sv.content.resize(19, 5);

    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    sv.visiblePercent.should.eql(100);
    sv.pageDown();
    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    sv.visiblePercent.should.eql(100);
    sv.pageUp();
    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    sv.visiblePercent.should.eql(100);
    sv.scrollDown();
    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    sv.visiblePercent.should.eql(100);
    sv.scrollUp();
    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    sv.visiblePercent.should.eql(100);
  });

  it("stays stuck to the bottom of the frame if the content grows", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), STANDARD_OPTIONS);

    sv.content.resize(sv.content.cols, 14);
    sv.frameTop.should.eql(4);
    sv.frameBottom.should.eql(14);
  });

  it("can unpin and then jump back", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), STANDARD_OPTIONS);

    sv.content.resize(sv.content.cols, 14);
    sv.frameTop.should.eql(4);
    sv.frameBottom.should.eql(14);

    sv.unpin();
    sv.content.resize(sv.content.cols, 15);
    sv.frameTop.should.eql(4);
    sv.frameBottom.should.eql(14);

    sv.jumpToBottom();
    sv.frameTop.should.eql(5);
    sv.frameBottom.should.eql(15);
  });

  it("adjustView", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), STANDARD_OPTIONS);
    sv.content.resize(19, 25);
    sv.scrollUp(100);
    sv.scrollDown(5);
    sv.frameTop.should.eql(5);

    sv.adjustView(row => row - 3);
    sv.frameTop.should.eql(2);
  });

  it("anchor and unpin", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), STANDARD_OPTIONS);

    sv.content.resize(sv.content.cols, 14);
    sv.frameTop.should.eql(4);
    sv.frameBottom.should.eql(14);
    sv.isPinned().should.eql(true);
    sv.setAnchor(13);

    sv.content.resize(sv.content.cols, 17);
    sv.frameTop.should.eql(7);
    sv.frameBottom.should.eql(17);

    sv.content.resize(sv.content.cols, 23);
    sv.frameTop.should.eql(13);
    sv.frameBottom.should.eql(23);
    sv.isPinned().should.eql(true);

    sv.content.resize(sv.content.cols, 24);
    sv.frameTop.should.eql(13);
    sv.frameBottom.should.eql(23);
    sv.isPinned().should.eql(false);
  });

  it("anchor with small content", () => {
    const canvas = new Canvas(20, 10);
    const sv = new ScrollView(canvas.all(), STANDARD_OPTIONS);

    sv.content.resize(sv.content.cols, 5);
    sv.frameTop.should.eql(0);
    sv.frameBottom.should.eql(10);
    sv.isPinned().should.eql(true);
    sv.setAnchor(-1);

    sv.content.resize(sv.content.cols, 15);
    sv.frameTop.should.eql(4);
    sv.frameBottom.should.eql(14);
    sv.isPinned().should.eql(false);
  });
});
