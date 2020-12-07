import "should";
import { Canvas, Key, Modifier, KeyType } from "antsy";
import { asyncIter } from "ballvalve";
import { EditBox } from "..";
import { EditBoxConfig } from "../lib/edit_box";

const WHITE = `[38;5;15m`;
const DIM = `[38;5;243m`;

const BS = new Key(0, KeyType.Backspace);
const RETURN = new Key(0, KeyType.Return);

const escpaint = (c: Canvas): string => c.paint().replace(/\u001b\[/g, "[");

const delay = (msec: number) => new Promise(resolve => setTimeout(resolve, msec));


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
    escpaint(canvas).should.eql(`${WHITE}boskoe`);
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
    escpaint(canvas).should.eql(`${WHITE}boshcoe`);
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
    escpaint(canvas).should.eql(`${WHITE}sc`);
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
    escpaint(canvas).should.eql(`${WHITE}boshcoe`);
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
    escpaint(canvas).should.eql(`${WHITE}bocsoe`);
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
    escpaint(canvas).should.eql(`${WHITE}this is some words`);
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
    escpaint(canvas).should.eql(`${WHITE}this is some words`);
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
    escpaint(canvas).should.eql(`h some qwords[2;9H`);
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
    for (const ch of "0123456789abcdefghi") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("[37m[40m[2J[H[B[38;5;15m0123456789abcdefghi");

    box.feed(Key.normal(0, "j"));
    escpaint(canvas).should.eql("[19D[38;5;243m…[38;5;15mbcdefghij[K");
    for (const ch of "klm") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("klm");

    for (const ch of "nopqrst") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("[12Dlmnopqrst   [3D");
    box.feed(Key.normal(0, "u"));
    escpaint(canvas).should.eql("u");

    box.feed(Key.normal(Modifier.Control, "A"));
    escpaint(canvas).should.eql("[11D0123456789abcdefghi[38;5;243m…[2H");
    box.feed(Key.normal(Modifier.Control, "E"));
    escpaint(canvas).should.eql("…[38;5;15mlmnopqrstu[K");
    for (let i = 0; i < 11; i++) box.feed(new Key(0, KeyType.Left));
    escpaint(canvas).should.eql("[10Dbcdefghijklmnopqrs[38;5;243m…[2;11H");

    box.feed(Key.normal(Modifier.Control, "E"));
    box.feed(new Key(Modifier.Control, KeyType.Up));
    escpaint(canvas).should.eql("[9D[38;5;15mlmnopqrstu[K[10D");
    box.feed(new Key(Modifier.Control, KeyType.Up));
    escpaint(canvas).should.eql("bcdefghijklmnopqrs[38;5;243m…[2;2H");
    box.feed(new Key(Modifier.Control, KeyType.Down));
    escpaint(canvas).should.eql("[10C");
  });

  it("scroll on two lines", () => {
    const canvas = new Canvas(20, 3);
    const region = canvas.clip(0, 1, 10, 3);
    const box = new EditBox(region, { color: "white", allowScroll: true });
    for (const ch of "0123456789abcdefghi") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("[37m[40m[2J[H[B[38;5;15m0123456789[3Habcdefghi");

    box.feed(Key.normal(0, "j"));
    escpaint(canvas).should.eql("[2H[38;5;243m…[38;5;15mbcdefghij[3H[K");
    for (const ch of "klm") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("klm");

    for (const ch of "nopqrst") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("[2;2Hlmnopqrst[3H   [3D");
    box.feed(Key.normal(0, "u"));
    escpaint(canvas).should.eql("u");

    box.feed(Key.normal(Modifier.Control, "A"));
    box.feed(new Key(Modifier.Control, KeyType.Up));
    box.feed(new Key(Modifier.Control, KeyType.Up));
    box.feed(new Key(Modifier.Control, KeyType.Up));
    escpaint(canvas).should.eql("[2H0123456789[3Habcdefghi[38;5;243m…[2H");
    box.feed(new Key(Modifier.Control, KeyType.Down));
    box.feed(new Key(Modifier.Control, KeyType.Down));
    box.feed(new Key(Modifier.Control, KeyType.Down));
    box.feed(new Key(Modifier.Control, KeyType.Down));
    box.feed(Key.normal(Modifier.Control, "E"));
    escpaint(canvas).should.eql("…[38;5;15mlmnopqrst[3Hu[K");
    box.feed(new Key(0, KeyType.Left));
    escpaint(canvas).should.eql("[D");
    box.feed(new Key(0, KeyType.Left));
    escpaint(canvas).should.eql("[2;10H");
    box.feed(new Key(0, KeyType.Right));
    escpaint(canvas).should.eql("[3H");
    for (let i = 0; i < 11; i++) box.feed(new Key(0, KeyType.Left));
    escpaint(canvas).should.eql("[2;2Hbcdefghij[3Hklmnopqrs[38;5;243m…[2;10H");

    box.feed(new Key(Modifier.Control, KeyType.Down));
    box.feed(new Key(Modifier.Control, KeyType.Down));
    box.feed(Key.normal(Modifier.Control, "E"));
    box.feed(new Key(Modifier.Control, KeyType.Up));
    escpaint(canvas).should.eql("[8D[38;5;15mlmnopqrst[3Hu[K[A");
    box.feed(new Key(Modifier.Control, KeyType.Up));
    escpaint(canvas).should.eql("bcdefghij[3Hklmnopqrs[38;5;243m…[2;2H");
    box.feed(new Key(Modifier.Control, KeyType.Down));
    escpaint(canvas).should.eql("[B");
  });

  it("no history", async () => {
    const canvas = new Canvas(20, 3);
    const region = canvas.clip(0, 1, 10, 3);
    const box = new EditBox(region, { color: "white", allowScroll: true, useHistory: false, enterAction: "ignore" });
    box.history.should.eql([]);
    for (const ch of "0123456789abcdefgh") box.feed(Key.normal(0, ch));
    escpaint(canvas).should.eql("[37m[40m[2J[H[B[38;5;15m0123456789[3Habcdefgh");

    // up/down navigate instead of manipulate history
    box.feed(new Key(Modifier.Control, KeyType.Up));
    escpaint(canvas).should.eql("[A");

    // don't commit text, don't add to history
    box.feed(new Key(0, KeyType.Backspace));
    box.feed(new Key(0, KeyType.Return));
    escpaint(canvas).should.eql("[D89a[3Hbcdefgh [2;8H");
    (await Promise.race([ box.events.next(), new Promise<number>(resolve => setTimeout(() => resolve(5), 10)) ])).should.eql(5);
  });

  it("setIdealHeight", async () => {
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

  it("scrolls up when bottom line is blank", async () => {
    const canvas = new Canvas(20, 3);
    const box = new EditBox(canvas.all(), {
      color: "white", allowScroll: true, enterAction: "insert", useHistory: false,
    });

    for (const ch of "hello") box.feed(Key.normal(0, ch));
    box.feed(new Key(0, KeyType.Return));
    box.feed(new Key(0, KeyType.Return));
    for (const ch of "third") box.feed(Key.normal(0, ch));
    box.feed(new Key(0, KeyType.Return));
    box.feed(new Key(0, KeyType.Return));
    await delay(10);
    escpaint(canvas).should.eql(`${WHITE}[40m[2J[H${DIM}…${WHITE}hird${DIM}↲[2H↲[3H`);

    box.feed(new Key(0, KeyType.Backspace));
    escpaint(canvas).should.eql(`${WHITE}[2J[H${DIM}…[2H${WHITE}third${DIM}↲[3H`);

    box.feed(new Key(0, KeyType.Backspace));
    escpaint(canvas).should.eql(`${WHITE}[2J[Hhello${DIM}↲[2H↲[3H${WHITE}third`);
  });

  describe("word wrap", () => {
    const commonOptions: Partial<EditBoxConfig> = {
      color: "white", enterAction: "insert", wordWrap: true, useHistory: false, visibleLinefeed: false,
      allowScroll: true,
    };

    it("basic", () => {
      const canvas = new Canvas(20, 3);
      const box = new EditBox(canvas.all(), commonOptions);
      for (const ch of "this house is incredible") box.feed(Key.normal(0, ch));
      escpaint(canvas).should.eql(`${WHITE}[40m[2J[Hthis house is[2Hincredible`);

      box.feed(new Key(0, KeyType.Backspace));
      box.feed(new Key(0, KeyType.Backspace));
      box.feed(new Key(0, KeyType.Backspace));
      box.feed(new Key(0, KeyType.Backspace));
      escpaint(canvas).should.eql("[2J[Hthis house is[2Hincred");

      box.feed(new Key(0, KeyType.Backspace));
      escpaint(canvas).should.eql("[2J[Hthis house is incre");
    });

    it("cursor movement", () => {
      const canvas = new Canvas(20, 3);
      const box = new EditBox(canvas.all(), commonOptions);
      for (const ch of "this house is incredible\nlook out!") box.feed(Key.normal(0, ch));
      escpaint(canvas).should.eql(`${WHITE}[40m[2J[Hthis house is[2Hincredible[3Hlook out!`);

      for (let i = 0; i < 3; i++) box.feed(new Key(0, KeyType.Left));
      for (let i = 0; i < 2; i++) box.feed(new Key(0, KeyType.Up));
      escpaint(canvas).should.eql("[1;7H");

      // pass the word-wrap space
      for (let i = 0; i < 7; i++) box.feed(new Key(0, KeyType.Right));
      escpaint(canvas).should.eql("[7C");
      box.feed(new Key(0, KeyType.Right));
      escpaint(canvas).should.eql("[2H");
      box.feed(new Key(0, KeyType.Left));
      escpaint(canvas).should.eql("[1;14H");

      // pass the linefeed
      box.feed(new Key(0, KeyType.Down));
      escpaint(canvas).should.eql("[2;11H");
      box.feed(new Key(0, KeyType.Right));
      escpaint(canvas).should.eql("[3H");
      box.feed(new Key(0, KeyType.Left));
      escpaint(canvas).should.eql("[2;11H");
    });

    it("home/end", () => {
      const canvas = new Canvas(20, 3);
      const box = new EditBox(canvas.all(), commonOptions);
      for (const ch of "this house is incredible\nlook out!") box.feed(Key.normal(0, ch));
      escpaint(canvas).should.eql(`${WHITE}[40m[2J[Hthis house is[2Hincredible[3Hlook out!`);

      box.feed(new Key(0, KeyType.Home));
      escpaint(canvas).should.eql("[9D");
      box.feed(new Key(0, KeyType.Up));
      box.feed(Key.normal(Modifier.Control, "E"));
      escpaint(canvas).should.eql("[2;11H");
      box.feed(new Key(0, KeyType.Up));
      box.feed(Key.normal(Modifier.Control, "E"));
      escpaint(canvas).should.eql("[1;14H");
    });

    it("delete to end of line", () => {
      const canvas = new Canvas(20, 3);
      const box = new EditBox(canvas.all(), commonOptions);
      for (const ch of "this house is incredible\nlook out!") box.feed(Key.normal(0, ch));
      escpaint(canvas).should.eql(`${WHITE}[40m[2J[Hthis house is[2Hincredible[3Hlook out!`);

      box.feed(new Key(0, KeyType.Left));
      box.feed(new Key(0, KeyType.Up));
      box.feed(Key.normal(Modifier.Control, "K"));
      escpaint(canvas).should.eql(`[2J[Hthis house is[2Hincredib[3Hlook out![2;9H`);

      box.feed(new Key(0, KeyType.Up));
      box.feed(Key.normal(Modifier.Control, "K"));
      escpaint(canvas).should.eql(`[2J[Hthis hou incredib[2Hlook out![1;9H`);
    });

    it("reflow", () => {
      const canvas = new Canvas(20, 3);
      const box = new EditBox(canvas.all(), commonOptions);
      for (const ch of "this house is incredible\nlook out!") box.feed(Key.normal(0, ch));
      escpaint(canvas).should.eql(`${WHITE}[40m[2J[Hthis house is[2Hincredible[3Hlook out!`);

      for (let i = 0; i < 2; i++) box.feed(new Key(0, KeyType.Up));
      for (let i = 0; i < 4; i++) box.feed(new Key(0, KeyType.Right));
      escpaint(canvas).should.eql("[1;14H");

      // delete the space. should reflow "isincredible" to line 2.
      box.feed(new Key(0, KeyType.Delete));
      escpaint(canvas).should.eql(`[2J[Hthis house[2Hisincredible[3Hlook out![2;3H`);

      // add a space between "isin" and "credible"
      for (let i = 0; i < 2; i++) box.feed(new Key(0, KeyType.Right));
      box.feed(Key.normal(0, "-"));
      escpaint(canvas).should.eql(`[2J[Hthis house isin-[2Hcredible[3Hlook out![2H`);
    });

    it("visible linefeed", () => {
      const canvas = new Canvas(20, 3);
      const box = new EditBox(canvas.all(), Object.assign({}, commonOptions, { visibleLinefeed: true }));
      for (const ch of "my chair!\n") box.feed(Key.normal(0, ch));
      escpaint(canvas).should.eql(`${WHITE}[40m[2J[Hmy chair!${DIM}↲[2H`);

      for (const ch of "huh?") box.feed(Key.normal(0, ch));
      escpaint(canvas).should.eql(`${WHITE}[2J[Hmy chair!${DIM}↲[2H${WHITE}huh?`);
    });

    it("vertical scroll within a region", () => {
      const canvas = new Canvas(20, 3);
      const box = new EditBox(canvas.all(), commonOptions);
      for (const ch of "this house is incredible\nlook out!\nfourth line") box.feed(Key.normal(0, ch));
      escpaint(canvas).should.eql(`${WHITE}[40m[2J[H${DIM}…${WHITE}ncredible[2Hlook out![3Hfourth line`);

      box.feed(new Key(0, KeyType.Home));
      box.feed(new Key(0, KeyType.Up));
      escpaint(canvas).should.eql("[2H");
      box.feed(new Key(0, KeyType.Up));
      escpaint(canvas).should.eql(`[2J[Hthis house is[2Hincredible[3Hlook out!${DIM} …[2H`);
    });
  });

  describe("suggestions", () => {
    it("rotate", async () => {
      box.autoComplete = () => [ "a", "b", "c" ];
      for (const ch of "hello") box.feed(Key.normal(0, ch));

      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`${WHITE}hello${DIM}a[D`);
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
      escpaint(canvas).should.eql(`${WHITE}meas${DIM}ure[3D`);
      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`les[3D`);
      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`ure[3D`);
    });

    it("only one", async () => {
      box.autoComplete = () => [ "less" ];
      for (const ch of "hope") box.feed(Key.normal(0, ch));

      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`${WHITE}hopeless`);
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
      escpaint(canvas).should.eql(`${WHITE}mea${DIM}sure[4D`);
      box.autoComplete = () => [ " time" ];

      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`ch${WHITE}  [4D`);
      box.feed(Key.normal(0, "l"));
      escpaint(canvas).should.eql(`l [D`);
      box.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(` time`);
    });
  });
});
