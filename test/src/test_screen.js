const screen = require("../../lib/tfjs/screen");
const util = require("util");

require("should");
require("source-map-support");

describe("Screen", () => {
  it("vsplit by ratio", () => {
    const s = new screen.Screen(40, 20);
    s.region.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=20)");
    const [ r1, r2 ] = s.vsplit(0.25);
    r1.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=5)");
    r2.box.toString().should.eql("Box(left=0 top=5 right=40 bottom=20)");
    s.resize(new screen.Box(0, 0, 30, 28));
    r1.box.toString().should.eql("Box(left=0 top=0 right=30 bottom=7)");
    r2.box.toString().should.eql("Box(left=0 top=7 right=30 bottom=28)");
  });

  it("splitTop", () => {
    let s = new screen.Screen(40, 20);
    s.region.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=20)");
    const [ r1, r2 ] = s.splitTop(7);
    r1.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=7)");
    r2.box.toString().should.eql("Box(left=0 top=7 right=40 bottom=20)");
    s.resize(new screen.Box(0, 0, 30, 28));
    r1.box.toString().should.eql("Box(left=0 top=0 right=30 bottom=7)");
    r2.box.toString().should.eql("Box(left=0 top=7 right=30 bottom=28)");
  });

  it("splitBottom", () => {
    let s = new screen.Screen(40, 20);
    s.region.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=20)");
    const [ r1, r2 ] = s.splitBottom(7);
    r1.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=13)");
    r2.box.toString().should.eql("Box(left=0 top=13 right=40 bottom=20)");
    s.resize(new screen.Box(0, 0, 30, 28));
    r1.box.toString().should.eql("Box(left=0 top=0 right=30 bottom=21)");
    r2.box.toString().should.eql("Box(left=0 top=21 right=30 bottom=28)");
  });

  it("hsplit by ratio", () => {
    const s = new screen.Screen(40, 20);
    s.region.box.toString().should.eql("Box(left=0 top=0 right=40 bottom=20)");
    const [ r1, r2 ] = s.hsplit(0.25);
    r1.box.toString().should.eql("Box(left=0 top=0 right=10 bottom=20)");
    r2.box.toString().should.eql("Box(left=10 top=0 right=40 bottom=20)");
    s.resize(new screen.Box(0, 0, 30, 28));
    r1.box.toString().should.eql("Box(left=0 top=0 right=8 bottom=28)");
    r2.box.toString().should.eql("Box(left=8 top=0 right=30 bottom=28)");
  });

});
