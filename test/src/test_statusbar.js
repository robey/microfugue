const box = require("../../lib/tfjs/box");
const region = require("../../lib/tfjs/region");
const statusbar = require("../../lib/tfjs/statusbar");
const util = require("util");

require("should");
require("source-map-support").install();

describe("StatusBar", () => {
  const r = new region.Region(null, new box.Box(0, 0, 20, 10));
  const bar = new statusbar.StatusBar(r, "white", "blue");

  it("builds a left/right", () => {
    bar.left = "monkeys";
    bar.right = "12";
    bar.computeLine().should.eql(" monkeys         12 ");
  });

  it("truncates when left is too long", () => {
    bar.left = "saskatchewan";
    bar.right = "incandesce";
    bar.computeLine().should.eql(" sas...  incandesce ");
  });

  it("truncates when even right is too long", () => {
    bar.left = ":)";
    bar.right = "saskatchewan incandescent";
    bar.computeLine().should.eql(" ...an incandescent ");
    bar.left = "";
    bar.computeLine().should.eql(" ...an incandescent ");
  });
});
