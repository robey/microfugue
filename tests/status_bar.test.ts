import { Canvas } from "antsy";
import { StatusBar } from "..";

import "should";
import "source-map-support/register";

describe("StatusBar", () => {
  const r = new Canvas(20, 10).all();
  const bar = new StatusBar(r, "white", "blue");

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
