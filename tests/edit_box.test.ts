import { Canvas, Key, Modifier, KeyType } from "antsy";
import { asyncIter } from "ballvalve";
import { EditBox } from "..";

import "should";
import "source-map-support/register";

const CLEAR = `[38;5;15m`;
const DIM = `[38;5;243m`;

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
    box.clearBindings();
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

  it("bind", () => {
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

  it("resize", () => {
    const canvas = new Canvas(20, 3);
    const region = canvas.clip(0, 1, 20, 3);
    const box = new EditBox(region, { color: "white", maxHistory: 5 });
    for (const ch of "hello") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("[37m[40m[2J[H[B[38;5;15mhello");

    canvas.resize(15, 3);
    region.resize(0, 1, 15, 3);
    escpaint(canvas).should.eql("[37m[40m[2J[H[B[38;5;15mhello");
  });

  it("scroll on one line", () => {
    const canvas = new Canvas(20, 3);
    const region = canvas.clip(0, 1, 20, 2);
    const box = new EditBox(region, { color: "white", allowScroll: true });
    for (const ch of "0123456789abcdefgh") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("[37m[40m[2J[H[B[38;5;15m0123456789abcdefgh");

    box.feed(Key.normal(0, "i"));
    escpaint(canvas).should.eql("[18D[38;5;243m…[38;5;15mbcdefghi[K");
    for (const ch of "jklm") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("jklm");

    for (const ch of "nopqrst") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("[12Dlmnopqrst   [3D");
    box.feed(Key.normal(0, "u"));
    escpaint(canvas).should.eql("u");

    box.feed(Key.normal(Modifier.Control, "A"));
    escpaint(canvas).should.eql("[11D0123456789abcdefghi[38;5;243m…[20D");
    box.feed(Key.normal(Modifier.Control, "E"));
    escpaint(canvas).should.eql("…[38;5;15mlmnopqrstu[K");
    for (let i = 0; i < 11; i++) box.feed(new Key(0, KeyType.Left));
    escpaint(canvas).should.eql("[10Dbcdefghijklmnopqrs[38;5;243m…[10D");

    box.feed(Key.normal(Modifier.Control, "E"));
    box.feed(new Key(Modifier.Control, KeyType.Up));
    escpaint(canvas).should.eql("[9D[38;5;15mlmnopqrstu[K[10D");
    box.feed(new Key(Modifier.Control, KeyType.Up));
    escpaint(canvas).should.eql("bcdefghijklmnopqrs[38;5;243m…[19D");
    box.feed(new Key(Modifier.Control, KeyType.Down));
    escpaint(canvas).should.eql("[10C");
  });

  it("scroll on two lines", () => {
    const canvas = new Canvas(20, 3);
    const region = canvas.clip(0, 1, 10, 3);
    const box = new EditBox(region, { color: "white", allowScroll: true });
    for (const ch of "0123456789abcdefgh") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("[37m[40m[2J[H[B[38;5;15m0123456789[3Habcdefgh");

    box.feed(Key.normal(0, "i"));
    escpaint(canvas).should.eql("[2H[38;5;243m…[38;5;15mbcdefghi [3H[K[2;10H");
    for (const ch of "jklm") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("j[3Hklm");

    for (const ch of "nopqrst") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("[2;2Hlmnopqrst[3H   [3D");
    box.feed(Key.normal(0, "u"));
    escpaint(canvas).should.eql("u");

    box.feed(Key.normal(Modifier.Control, "A"));
    escpaint(canvas).should.eql("[2H0123456789[3Habcdefghi[38;5;243m…[2H");
    box.feed(Key.normal(Modifier.Control, "E"));
    escpaint(canvas).should.eql("…[38;5;15mlmnopqrst[3Hu[K");
    for (let i = 0; i < 11; i++) box.feed(new Key(0, KeyType.Left));
    escpaint(canvas).should.eql("[Abcdefghij[3Hklmnopqrs[38;5;243m…[10D");

    box.feed(Key.normal(Modifier.Control, "E"));
    box.feed(new Key(Modifier.Control, KeyType.Up));
    escpaint(canvas).should.eql("[2;2H[38;5;15mlmnopqrst[3Hu[K[A");
    box.feed(new Key(Modifier.Control, KeyType.Up));
    escpaint(canvas).should.eql("bcdefghij[3Hklmnopqrs[38;5;243m…[2;2H");
    box.feed(new Key(Modifier.Control, KeyType.Down));
    escpaint(canvas).should.eql("[B");
  });

  it("setIdealHeight", async () => {
    const delay = (msec: number) => new Promise(resolve => setTimeout(resolve, msec));

    const canvas = new Canvas(20, 3);
    const region = canvas.clip(0, 0, 10, 1);
    const requests: number[] = [];
    const heightChangeRequest = (lines: number) => {
      requests.push(lines);
      region.resize(0, 0, 10, Math.min(lines, 3));
    };
    const box = new EditBox(region, { color: "white", allowScroll: true, heightChangeRequest });

    for (const ch of "0123456789abcdefgh") box.feed(Key.normal(0, ch));
    await delay(1);
    requests.should.eql([ 2 ]);
    box.region.rows.should.eql(2);
    escpaint(canvas).should.eql("[37m[40m[2J[H[38;5;15m0123456789[2Habcdefgh");

    for (const ch of "ijklm") box.feed(Key.normal(0, ch));
    await delay(1);
    requests.should.eql([ 2, 3 ]);
    box.region.rows.should.eql(3);
    escpaint(canvas).should.eql("ij[3Hklm");

    box.feed(RETURN);
    await delay(1);
    requests.should.eql([ 2, 3, 1 ]);
    box.region.rows.should.eql(1);
    escpaint(canvas).should.eql(`[H[K[B[K[B   [H`);
  });

  describe("suggestions", () => {
    it("rotate", async () => {
      box.autoComplete = () => [ "a", "b", "c" ];
      for (const ch of "hello") box.feed(Key.normal(0, ch));

      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`${CLEAR}hello${DIM}a[D`);
      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`b[D`);
      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`c[D`);
      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`a[D`);

      box.feed(new Key(0, KeyType.Right));
      escpaint(canvas).should.eql(`[38;5;15ma`);
      box.feed(RETURN);
      (await asyncIter(box.events).take(1).collect()).should.eql([
        "helloa",
      ]);
    });

    it("mutual prefix", async () => {
      box.autoComplete = () => [ "sure", "sles" ];
      for (const ch of "mea") box.feed(Key.normal(0, ch));

      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`${CLEAR}meas${DIM}ure[3D`);
      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`les[3D`);
      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`ure[3D`);
    });

    it("only one", async () => {
      box.autoComplete = () => [ "less" ];
      for (const ch of "hope") box.feed(Key.normal(0, ch));

      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`${CLEAR}hopeless`);
    });

    it("nothing", async () => {
      box.autoComplete = () => undefined;
      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(``);
      box.feed(new Key(0, KeyType.Right));
      escpaint(canvas).should.eql(``);
    });

    it("reset on typing", async () => {
      box.autoComplete = () => [ "sure", "ch" ];
      for (const ch of "mea") box.feed(Key.normal(0, ch));

      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`${CLEAR}mea${DIM}sure[4D`);
      box.autoComplete = () => [ " time" ];

      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`ch${CLEAR}  [4D`);
      box.feed(Key.normal(0, "l"));
      escpaint(canvas).should.eql(`l [D`);
      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(` time`);
    });
  });
});
