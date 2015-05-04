const box = require("../../lib/tfjs/box");
const screen = require("../../lib/tfjs/screen");
const util = require("util");

require("should");
require("source-map-support").install();

describe("Screen", () => {
  it("vsplit by ratio", () => {
    const s = new screen.Screen(40, 20);
    s.region.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=20)");
    const [ r1, r2 ] = s.vsplit(0.25);
    r1.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=5)");
    r2.box.toString().should.eql("Box(left=0 top=5 right=40 bottom=20)");
    s.resize(30, 28);
    r1.box.toString().should.eql("Box(left=0 top=0 right=30 bottom=7)");
    r2.box.toString().should.eql("Box(left=0 top=7 right=30 bottom=28)");
  });

  it("splitTop", () => {
    let s = new screen.Screen(40, 20);
    s.region.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=20)");
    const [ r1, r2 ] = s.splitTop(7);
    r1.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=7)");
    r2.box.toString().should.eql("Box(left=0 top=7 right=40 bottom=20)");
    s.resize(30, 28);
    r1.box.toString().should.eql("Box(left=0 top=0 right=30 bottom=7)");
    r2.box.toString().should.eql("Box(left=0 top=7 right=30 bottom=28)");
  });

  it("splitBottom", () => {
    let s = new screen.Screen(40, 20);
    s.region.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=20)");
    const [ r1, r2 ] = s.splitBottom(7);
    r1.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=13)");
    r2.box.toString().should.eql("Box(left=0 top=13 right=40 bottom=20)");
    s.resize(30, 28);
    r1.box.toString().should.eql("Box(left=0 top=0 right=30 bottom=21)");
    r2.box.toString().should.eql("Box(left=0 top=21 right=30 bottom=28)");
  });

  it("hsplit by ratio", () => {
    const s = new screen.Screen(40, 20);
    s.region.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=20)");
    const [ r1, r2 ] = s.hsplit(0.25);
    r1.box.toString().should.eql("Box(left=0 top=0 right=10 bottom=20)");
    r2.box.toString().should.eql("Box(left=10 top=0 right=40 bottom=20)");
    s.resize(30, 28);
    r1.box.toString().should.eql("Box(left=0 top=0 right=8 bottom=28)");
    r2.box.toString().should.eql("Box(left=8 top=0 right=30 bottom=28)");
  });

  it("splitLeft", () => {
    let s = new screen.Screen(40, 20);
    s.region.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=20)");
    const [ r1, r2 ] = s.splitLeft(7);
    r1.box.toString().should.eql("Box(left=0 top=0 right=7 bottom=20)");
    r2.box.toString().should.eql("Box(left=7 top=0 right=40 bottom=20)");
    s.resize(30, 28);
    r1.box.toString().should.eql("Box(left=0 top=0 right=7 bottom=28)");
    r2.box.toString().should.eql("Box(left=7 top=0 right=30 bottom=28)");
  });

  it("splitBottom", () => {
    let s = new screen.Screen(40, 20);
    s.region.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=20)");
    const [ r1, r2 ] = s.splitRight(7);
    r1.box.toString().should.eql("Box(left=0 top=0 right=33 bottom=20)");
    r2.box.toString().should.eql("Box(left=33 top=0 right=40 bottom=20)");
    s.resize(30, 28);
    r1.box.toString().should.eql("Box(left=0 top=0 right=23 bottom=28)");
    r2.box.toString().should.eql("Box(left=23 top=0 right=30 bottom=28)");
  });

  it("return ordered list of regions for a deeper split", () => {
    let s = new screen.Screen(80, 24);
    const [ r1, r2 ] = s.splitBottom(4);
    const [ r3, r4 ] = r1.splitRight(10);
    const [ r5, r6 ] = r4.splitTop(2);

    s.regions.map((r) => r.box.toString()).should.eql([
      "Box(left=0 top=0 right=70 bottom=20)",
      "Box(left=70 top=0 right=80 bottom=2)",
      "Box(left=70 top=2 right=80 bottom=20)",
      "Box(left=0 top=20 right=80 bottom=24)"
    ]);
  });

  it("changeSiblingSplit", () => {
    let s = new screen.Screen(80, 24);
    const [ r1, r2 ] = s.splitBottom(4);
    s.regions.map((r) => r.box.toString()).should.eql([
      "Box(left=0 top=0 right=80 bottom=20)",
      "Box(left=0 top=20 right=80 bottom=24)",
    ]);
    r2.changeSiblingSplit(5);
    s.regions.map((r) => r.box.toString()).should.eql([
      "Box(left=0 top=0 right=80 bottom=19)",
      "Box(left=0 top=19 right=80 bottom=24)",
    ]);
  });
});
