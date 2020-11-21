import "should";
import { Canvas, GridLayout, Key, KeyType, Modifier } from "antsy";
import { Form, FormButton, FormEditBox, FormText, RichText } from "..";

const RESET = `[37m[40m`;
const CLEAR = RESET + `[2J[H`;
const BLUE = `[38;5;12m`;
const RED = `[38;5;9m`;
const WHITE = `[38;5;15m`;
const GRAY = `[38;5;246m`;
const BLUE_BG = `[44m`;
const GRAY_BG = `[48;5;236m`;
const DIM = `[38;5;243m`;
const LABEL = `[38;5;252m`;
const FOCUS = WHITE + BLUE_BG;
const NORMAL = GRAY + GRAY_BG;

const escpaint = (c: Canvas): string => c.paint().replace(/\u001b\[/g, "[");

const delay = (msec: number) => new Promise(resolve => setTimeout(resolve, msec));


describe("Form", () => {
  it("draws text", () => {
    const canvas = new Canvas(25, 3);
    const c1 = new FormText(RichText.parse("{00f:Blue label that will line-wrap}", "fff"));
    const c2 = new FormText(RichText.parse("{f00:Red label that also wraps off screen}", "fff"));
    const form = new Form(
      canvas.all(),
      [ { component: c1, fullWidth: true }, { component: c2, fullWidth: true }, ],
      { verticalPadding: 0 }
    );

    escpaint(canvas).should.eql(
      `${CLEAR}${BLUE}Blue label that will [37m   ${DIM}█` +
      `[2H${BLUE}line-wrap[15C${DIM}█` +
      `[3H${RED}Red label that also [37m    ${DIM}│[H`
    );
  });

  it("draws text with label", () => {
    const canvas = new Canvas(35, 3);
    const c1 = new FormText(RichText.parse("{00f:Blue label that will line-wrap}", "fff"));
    const c2 = new FormText(RichText.parse("{f00:Red label that also wraps off screen}", "fff"));
    const form = new Form(
      canvas.all(),
      [ { component: c1, label: "crimson" }, { component: c2, label: "cobalt" }, ],
      { verticalPadding: 0, left: GridLayout.fixed(10) }
    );

    escpaint(canvas).should.eql(
      `${CLEAR}${WHITE}  crimson ${BLUE}Blue label that will [37m   ${DIM}█` +
      `[2;11H${BLUE}line-wrap[15C${DIM}█` +
      `[3;4H${GRAY}cobalt ${RED}Red label that also [37m    ${DIM}│[1;11H`
    );
  });

  it("moves focus", () => {
    const canvas = new Canvas(25, 3);
    const c1 = new FormText(RichText.parse("{00f:Blue label that will line-wrap}", "fff"), { acceptsFocus: true });
    const c2 = new FormText(RichText.parse("{f00:Red label that also wraps off screen}", "fff"), { acceptsFocus: true });
    const form = new Form(
      canvas.all(),
      [ { component: c1, fullWidth: true }, { component: c2, fullWidth: true }, ],
      { verticalPadding: 0 }
    );

    escpaint(canvas).should.eql(
      `${CLEAR}${BLUE}Blue label that will [37m   ${DIM}█` +
      `[2H${BLUE}line-wrap[15C${DIM}█` +
      `[3H${RED}Red label that also [37m    ${DIM}│[H`
    );
    form.next();
    escpaint(canvas).should.eql(
      `${BLUE}line-wrap[K[15C${DIM}│` +
      `[2H${RED}Red label that also` +
      `[3Hwraps off screen        ${DIM}█[2H`
    );
    form.prev();
    escpaint(canvas).should.eql(
      `[A${BLUE}Blue label that will    ${DIM}█` +
      `[2H${BLUE}line-wrap[K[15C${DIM}█` +
      `[3H${RED}Red label that also     ${DIM}│[H`
    );

    // and keys!
    form.feed(new Key(0, KeyType.Tab));
    escpaint(canvas).should.eql(
      `${BLUE}line-wrap[K[15C${DIM}│` +
      `[2H${RED}Red label that also` +
      `[3Hwraps off screen        ${DIM}█[2H`
    );
    form.feed(new Key(Modifier.Control, KeyType.Up));
    escpaint(canvas).should.eql(
      `[A${BLUE}Blue label that will    ${DIM}█` +
      `[2H${BLUE}line-wrap[K[15C${DIM}█` +
      `[3H${RED}Red label that also     ${DIM}│[H`
    );
  });

  // vertical padding
  it("computes vertical padding", () => {
    const canvas = new Canvas(25, 8);
    const c1 = new FormText(RichText.parse("{00f:blue}", "fff"));
    const c2 = new FormText(RichText.parse("{f00:red", "fff"));
    const form = new Form(
      canvas.all(),
      [ { component: c1, fullWidth: true }, { component: c2, fullWidth: true }, ],
      { verticalPadding: 2 }
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2B${BLUE}blue` +
      `[6H${RED}red[3H`
    );
  });

  it("button", () => {
    let event = "";
    const canvas = new Canvas(30, 8);
    const button = new FormButton(RichText.parse("OK"), () => { event = "ok" });
    const form = new Form(
      canvas.all(),
      [ { component: button, label: "Done?" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;5H${WHITE}Done? ${BLUE_BG}▶ OK ◀[4D`
    );

    form.feed(Key.normal(0, " "));
    event.should.eql("ok");
  });

  it("focus", () => {
    let event = "";
    const canvas = new Canvas(30, 8);
    const button1 = new FormButton(RichText.parse("OK"), () => { event = "ok" });
    const button2 = new FormButton(RichText.parse("Cancel"), () => { event = "cancel" });
    const form = new Form(
      canvas.all(),
      [ { component: button1, label: "Done?" }, { component: button2 } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;5H${WHITE}Done? ${BLUE_BG}▶ OK ◀` +
      `[4;11H${NORMAL}  Cancel  ` +
      `[2;13H`
    );

    form.next();
    escpaint(canvas).should.eql(
      `[2D  OK  [4;11H${FOCUS}▶ Cancel ◀[8D`
    );

    // don't crash
    form.next();
    escpaint(canvas).should.eql("");

    form.prev();
    escpaint(canvas).should.eql(
      `[2;11H▶ OK ◀[4;11H${NORMAL}  Cancel  [2;13H`
    );
  });

  describe("edit box", () => {
    it("draws", () => {
      const canvas = new Canvas(45, 8);
      const box = new FormEditBox("test content", { minHeight: 3, maxHeight: 5 });
      const form = new Form(
        canvas.all(),
        [ { component: box, label: "Gripes" } ],
        { left: GridLayout.fixed(10) },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[2;4H${WHITE}Gripes ` +
        `${BLUE_BG}test content[K[22C${DIM}[40m ` +
        `[3;11H${FOCUS}[K[34C${DIM}[40m ` +
        `[4;11H${FOCUS}[K[34C${DIM}[40m ` +
        `[2;23H`
      );
    });

    it("draws without focus", () => {
      const canvas = new Canvas(45, 8);
      const button = new FormButton(RichText.parse("OK"), () => null);
      const box = new FormEditBox("test content", { minHeight: 3, maxHeight: 5 });
      const form = new Form(
        canvas.all(),
        [ { component: button }, { component: box, label: "Gripes" } ],
        { left: GridLayout.fixed(10) },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[2;11H${FOCUS}▶ OK ◀` +
        `[4;4H${GRAY}[40mGripes ` +
        `${GRAY_BG}test content[K[22C${DIM}[40m ` +
        `[5;11H${NORMAL}[K[34C${DIM}[40m ` +
        `[6;11H${NORMAL}[K[34C${DIM}[40m ` +
        `[2;13H`
      );
    });

    it("draws narrow", () => {
      const canvas = new Canvas(45, 8);
      const box = new FormEditBox("test", { maxLength: 10 });
      const form = new Form(
        canvas.all(),
        [ { component: box, label: "Gripes" } ],
        { left: GridLayout.fixed(10) },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[2;4H${WHITE}Gripes ` +
        `${BLUE_BG}test      [6D`
      );
    });

    it("handles keys", () => {
      const canvas = new Canvas(45, 8);
      const button = new FormButton(RichText.parse("OK"), () => null);
      const box = new FormEditBox("test content", { minHeight: 3, maxHeight: 5 });
      const form = new Form(
        canvas.all(),
        [ { component: box, label: "Gripes" }, { component: button } ],
        { left: GridLayout.fixed(10) },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[2;4H${WHITE}Gripes ` +
        `${BLUE_BG}test content[K[22C${DIM}[40m ` +
        `[3;11H${FOCUS}[K[34C${DIM}[40m ` +
        `[4;11H${FOCUS}[K[34C${DIM}[40m ` +
        `[6;11H${NORMAL}  OK  ` +
        `[2;23H`
      );

      form.feed(Key.normal(0, "!"));
      form.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(
        `[12Dtest content![K[21C${DIM}[40m ` +
        `[3;11H${NORMAL}[K[34C${DIM}[40m ` +
        `[4;11H${NORMAL}[K[34C${DIM}[40m ` +
        `[6;11H${FOCUS}▶ OK ◀` +
        `[4D`
      );

      box.text.should.eql("test content!");
    });

    it("grows and shrinks", async () => {
      const canvas = new Canvas(30, 8);
      const button = new FormButton(RichText.parse("OK"), () => null);
      const box = new FormEditBox("test content", { minHeight: 1, maxHeight: 3 });
      const form = new Form(
        canvas.all(),
        [ { component: box, label: "Gripes" }, { component: button } ],
        { left: GridLayout.fixed(10), labelSpacing: 2 },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[2;3H${WHITE}Gripes  ` +
        `${BLUE_BG}test content       ` +
        `[4;11H${NORMAL}  OK  ` +
        `[2;23H`
      );

      for (const ch of " for you!") form.feed(Key.normal(0, ch));
      await delay(10);

      escpaint(canvas).should.eql(
        `${FOCUS} for yo[3;11Hu![K[17C${DIM}[40m [4H${WHITE}[K[5;11H${NORMAL}  OK  [3;13H`
      );
    });
  });

  it("complex form", async () => {
    const canvas = new Canvas(80, 25);
    canvas.all().color("red", "black").clear();
    canvas.redraw();

    const text1 = new FormText(RichText.parse("Editing a place..."));
    const keyBox = new FormEditBox("tavern", { minWidth: 4, maxLength: 16, minHeight: 1, maxHeight: 1 });
    const titleBox = new FormEditBox("Red Stag Tavern", { minWidth: 10, maxLength: 40, minHeight: 1, maxHeight: 1 });
    const descBox = new FormEditBox(
      "A rustic boardwalk begins here and continues to the east, with views of the southern endcap lake. A large building with few windows, made of weathered planks, lies to the north. A small sign swings from a pole next to the entrance. To the west, a stony path continues along the lake shore.",
      { minHeight: 3, maxLength: 4096 }
    );
    const form = new Form(
      canvas.all(),
      [
        { component: text1, fullWidth: true },
        { component: keyBox, label: "Key:" },
        { component: titleBox, label: "Title:" },
        { component: descBox, label: "Description:" }
      ],
      {}
    );

    form.next();
    form.next();

    // wait for the descBox to resize to fit
    await delay(10);
    escpaint(canvas).should.eql(
      ""
    );

    // console.log(canvas.paint() + "@\n\n\n\n\n\n\n\n");
  });
});
