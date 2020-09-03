import { Canvas, Key, Modifier, KeyType } from "antsy";
import { asyncIter } from "ballvalve";
import { EditBox } from "..";

import "should";
import "source-map-support/register";

const CLEAR = `[38;5;15m`;
const RESET = `[38;5;252m${CLEAR}`;

const BS = new Key(0, KeyType.Backspace);
const RETURN = new Key(0, KeyType.Return);

const escpaint = (c: Canvas): string => c.paint().replace(/\u001b\[/g, "[");

describe("EditBox", () => {
  const canvas = new Canvas(20, 3);
  const box = new EditBox(canvas.clip(0, 1, 20, 3), { color: "white", maxHistory: 5 });

  beforeEach(() => {
    canvas.all().clear();
    box.reset();
    box.clearHistory();
    canvas.paint();
  });

  it("enter letters and backspace", async () => {
    for (const ch of "boskoe") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql(`${CLEAR}boskoe`);
    box.feed(BS);
    box.feed(BS);
    box.feed(BS);
    escpaint(canvas).should.eql(`[3D   [3D`);
    for (const ch of "coe") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql(`coe`);
    box.feed(RETURN);
    escpaint(canvas).should.eql(`[6D[K`);
    (await asyncIter(box.events).take(1).collect()).should.eql([ "boscoe" ]);
  });

  it("left/right and delete", async () => {
    for (const ch of "boshcoe") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql(`${CLEAR}boshcoe`);
    box.feed(new Key(0, KeyType.Left));
    box.feed(new Key(0, KeyType.Left));
    box.feed(new Key(0, KeyType.Left));
    box.feed(new Key(0, KeyType.Left));
    box.feed(Key.normal(Modifier.Control, "B"));
    box.feed(Key.normal(Modifier.Control, "B"));
    escpaint(canvas).should.eql(`[6D`);
    box.feed(new Key(0, KeyType.Right));
    box.feed(Key.normal(Modifier.Control, "F"));
    escpaint(canvas).should.eql(`[2C`);
    box.feed(new Key(0, KeyType.Delete));
    escpaint(canvas).should.eql(`coe [4D`);
    box.feed(RETURN);
    escpaint(canvas).should.eql(`[3D[K`);
    (await asyncIter(box.events).take(1).collect()).should.eql([ "boscoe" ]);
  });

  it("home/end", async () => {
    for (const ch of "sc") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql(`${CLEAR}sc`);
    box.feed(new Key(0, KeyType.Home));
    box.feed(Key.normal(0, "o"));
    escpaint(canvas).should.eql("[2Dosc[2D");
    box.feed(new Key(0, KeyType.End));
    box.feed(Key.normal(0, "o"));
    escpaint(canvas).should.eql("sco");
    box.feed(Key.normal(Modifier.Control, "A"));
    box.feed(Key.normal(0, "b"));
    escpaint(canvas).should.eql("[4Dbosco[4D");
    box.feed(Key.normal(Modifier.Control, "E"));
    box.feed(Key.normal(0, "e"));
    escpaint(canvas).should.eql("oscoe");
    box.feed(RETURN);
    escpaint(canvas).should.eql(`[6D[K`);
    (await asyncIter(box.events).take(1).collect()).should.eql([ "boscoe" ]);
  });

  it("C-k", async () => {
    for (const ch of "boshcoe") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql(`${CLEAR}boshcoe`);
    box.feed(new Key(0, KeyType.Home));
    box.feed(new Key(0, KeyType.Right));
    box.feed(new Key(0, KeyType.Right));
    box.feed(new Key(0, KeyType.Right));
    box.feed(Key.normal(Modifier.Control, "K"));
    escpaint(canvas).should.eql("[4D[K");
    for (const ch of "coe") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql(`coe`);
    box.feed(RETURN);
    escpaint(canvas).should.eql(`[6D[K`);
    (await asyncIter(box.events).take(1).collect()).should.eql([ "boscoe" ]);
  });

  it("C-t", async () => {
    for (const ch of "bocsoe") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql(`${CLEAR}bocsoe`);
    box.feed(new Key(0, KeyType.Left));
    box.feed(new Key(0, KeyType.Left));
    box.feed(new Key(0, KeyType.Left));
    box.feed(Key.normal(Modifier.Control, "T"));
    escpaint(canvas).should.eql(`[4Dsc[D`);
    box.feed(RETURN);
    escpaint(canvas).should.eql(`[3D[K`);
    (await asyncIter(box.events).take(1).collect()).should.eql([ "boscoe" ]);
  });

  it("C-w", async () => {
    for (const ch of "this is some words") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql(`${CLEAR}this is some words`);
    box.feed(Key.normal(Modifier.Control, "W"));
    escpaint(canvas).should.eql(`[6D[K[C`);
    box.feed(Key.normal(Modifier.Control, "W"));
    escpaint(canvas).should.eql(`[6D[K[C`);
    box.feed(Key.normal(Modifier.Control, "W"));
    escpaint(canvas).should.eql(`[3D  [2D`);
    box.feed(RETURN);
    escpaint(canvas).should.eql(`[5D[K`);
    (await asyncIter(box.events).take(1).collect()).should.eql([ "this " ]);
  });

  it("left/right word", async () => {
    for (const ch of "this is some words") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql(`${CLEAR}this is some words`);
    box.feed(new Key(Modifier.Control, KeyType.Left));
    escpaint(canvas).should.eql(`[5D`);
    box.feed(Key.normal(0, "q"));
    escpaint(canvas).should.eql(`qwords[5D`);
    box.feed(new Key(Modifier.Control, KeyType.Left));
    box.feed(new Key(Modifier.Control, KeyType.Left));
    box.feed(new Key(Modifier.Control, KeyType.Right));
    escpaint(canvas).should.eql(`[2D`);
    box.feed(new Key(Modifier.Control, KeyType.Left));
    box.feed(new Key(Modifier.Control, KeyType.Left));
    box.feed(new Key(Modifier.Control, KeyType.Right));
    escpaint(canvas).should.eql(`[5D`);
    box.feed(Key.normal(0, "h"));
    escpaint(canvas).should.eql(`h some qwords[12D`);
    box.feed(RETURN);
    escpaint(canvas).should.eql(`[8D[K`);
    (await asyncIter(box.events).take(1).collect()).should.eql([ "this ish some qwords" ]);
  });

  describe("history", () => {
    it("remembers anything", async () => {
      for (const ch of "first line") box.feed(Key.normal(0, ch));
      box.feed(RETURN);
      box.feed(new Key(0, KeyType.Up));
      box.feed(RETURN);
      for (const ch of "second line") box.feed(Key.normal(0, ch));
      box.feed(RETURN);
      box.feed(new Key(0, KeyType.Up));
      box.feed(new Key(0, KeyType.Up));
      box.feed(RETURN);
      (await asyncIter(box.events).take(4).collect()).should.eql([
        "first line",
        "first line",
        "second line",
        "first line",
      ]);
    });

    it("restores your typing", async () => {
      for (const ch of "first line") box.feed(Key.normal(0, ch));
      box.feed(RETURN);
      for (const ch of "second line") box.feed(Key.normal(0, ch));
      box.feed(new Key(0, KeyType.Up));
      box.feed(new Key(0, KeyType.Down));
      box.feed(RETURN);
      (await asyncIter(box.events).take(2).collect()).should.eql([
        "first line",
        "second line",
      ]);
    });

    it("replaces an old entry", async () => {
      for (const ch of "first line") box.feed(Key.normal(0, ch));
      box.feed(RETURN);
      for (const ch of "second line") box.feed(Key.normal(0, ch));
      box.feed(RETURN);
      for (const ch of "first line") box.feed(Key.normal(0, ch));
      box.feed(RETURN);
      box.feed(new Key(0, KeyType.Up));
      box.feed(new Key(0, KeyType.Up));
      box.feed(new Key(0, KeyType.Up));
      box.feed(RETURN);
      (await asyncIter(box.events).take(4).collect()).should.eql([
        "first line",
        "second line",
        "first line",
        "second line",
      ]);
    });
  });

  it("bind", async () => {
    let count1 = 0, count2 = 0, count3 = 0;
    box.bind(new Key(0, KeyType.PageUp), () => { count1++; });
    box.bind(new Key(0, KeyType.PageDown), () => { count2++; });
    box.feed(new Key(0, KeyType.PageUp));
    count1.should.eql(1);
    count2.should.eql(0);
    box.feed(new Key(0, KeyType.PageDown));
    count1.should.eql(1);
    count2.should.eql(1);

    // old binding must be overwritten
    box.bind(new Key(0, KeyType.PageUp), () => { count3++; });
    box.feed(new Key(0, KeyType.PageUp));
    count1.should.eql(1);
    count2.should.eql(1);
    count3.should.eql(1);
  });
});
