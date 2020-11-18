import "should";
import { Canvas, GridLayout, Key, KeyType, Modifier } from "antsy";
import { Form, FormButtons, FormEditBox, FormText, RichText } from "..";

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
      `${CLEAR}${LABEL}  crimson ${BLUE}Blue label that will [37m   ${DIM}█` +
      `[2;11H${BLUE}line-wrap[15C${DIM}█` +
      `[3;4Hcobalt ${RED}Red label that also [37m    ${DIM}│[1;11H`
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

  it("draws buttons", () => {
    const canvas = new Canvas(30, 8);
    const buttons = new FormButtons([
      { text: RichText.parse("OK") },
      { text: RichText.parse("Cancel") }
    ]);
    const form = new Form(
      canvas.all(),
      [ { component: buttons, label: "Done?" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;5H${LABEL}Done? ${FOCUS} ■ OK ${RESET}  ${NORMAL} □ Cancel [17D`
    );
  });

  it("focuses buttons", () => {
    const canvas = new Canvas(30, 8);
    const buttons = new FormButtons([
      { text: RichText.parse("OK") },
      { text: RichText.parse("Cancel") }
    ]);
    const form = new Form(
      canvas.all(),
      [ { component: buttons, label: "Done?" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;5H${LABEL}Done? ${FOCUS} ■ OK ${RESET}  ${NORMAL} □ Cancel [17D`
    );
    form.next();
    escpaint(canvas).should.eql(
      `[D □ OK ${RESET}  ${FOCUS} ■ Cancel [9D`
    );
  });

  it("focuses between button rows", () => {
    const canvas = new Canvas(45, 8);
    const buttons = new FormButtons([
      { text: RichText.parse("Abort") },
      { text: RichText.parse("Retry") },
      { text: RichText.parse("Fail") },
    ]);
    const buttons2 = new FormButtons([ { text: RichText.parse("Save") } ]);
    const form = new Form(
      canvas.all(),
      [ { component: buttons, label: "Error!" }, { component: buttons2 } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;4H${LABEL}Error! ` +
      `${FOCUS} ■ Abort ${RESET}  ${NORMAL} □ Retry ${RESET}  ${NORMAL} □ Fail ` +
      `[4;11H □ Save [2;12H`
    );
    form.next();
    form.next();
    escpaint(canvas).should.eql(
      `[D □ Abort [13C${FOCUS} ■ Fail [7D`
    );

    form.next();
    escpaint(canvas).should.eql(
      `[D${NORMAL} □ Fail [4;11H${FOCUS} ■ Save [7D`
    );

    form.prev();
    escpaint(canvas).should.eql(
      `[2;33H ■ Fail [4;11H${NORMAL} □ Save [2;34H`
    );
  });

  it("button events", () => {
    let event = "";
    const canvas = new Canvas(45, 8);
    const buttons = new FormButtons([
      { text: RichText.parse("Abort"), onClick: () => { event = "abort" } },
      { text: RichText.parse("Retry") },
      { text: RichText.parse("Fail"), onClick: () => { event = "fail" } },
    ]);
    const form = new Form(
      canvas.all(),
      [ { component: buttons, label: "Error!" } ],
      { left: GridLayout.fixed(10) },
    );

    form.feed(new Key(0, KeyType.Return));
    event.should.eql("abort");
    form.next();
    form.next();
    form.feed(Key.normal(0, " "));
    event.should.eql("fail");
  });

  it("draws edit box", () => {
    const canvas = new Canvas(45, 8);
    const box = new FormEditBox("test content", { minHeight: 3, maxHeight: 5 });
    const form = new Form(
      canvas.all(),
      [ { component: box, label: "Gripes" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;4H${LABEL}Gripes ` +
      `${FOCUS}test content[K[22C${DIM}[40m ` +
      `[3;11H${FOCUS}[K[34C${DIM}[40m ` +
      `[4;11H${FOCUS}[K[34C${DIM}[40m ` +
      `[2;23H`
    );
  });

  it("draws edit box without focus", () => {
    const canvas = new Canvas(45, 8);
    const button = new FormButtons([ { text: RichText.parse("OK") } ]);
    const box = new FormEditBox("test content", { minHeight: 3, maxHeight: 5 });
    const form = new Form(
      canvas.all(),
      [ { component: button }, { component: box, label: "Gripes" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;11H${FOCUS} ■ OK ` +
      `[4;4H${DIM}[40mGripes ` +
      `${NORMAL}test content[K[22C${DIM}[40m ` +
      `[5;11H${NORMAL}[K[34C${DIM}[40m ` +
      `[6;11H${NORMAL}[K[34C${DIM}[40m ` +
      `[2;12H`
    );
  });

  it("draws narrow edit box", () => {
    const canvas = new Canvas(45, 8);
    const box = new FormEditBox("test", { maxLength: 10 });
    const form = new Form(
      canvas.all(),
      [ { component: box, label: "Gripes" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;4H${LABEL}Gripes ` +
      `${FOCUS}test      [6D`
    );
  });

  it("handles keys", () => {
    const canvas = new Canvas(45, 8);
    const button = new FormButtons([ { text: RichText.parse("OK") } ]);
    const box = new FormEditBox("test content", { minHeight: 3, maxHeight: 5 });
    const form = new Form(
      canvas.all(),
      [ { component: box, label: "Gripes" }, { component: button } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;4H${LABEL}Gripes ` +
      `${FOCUS}test content[K[22C${DIM}[40m ` +
      `[3;11H${FOCUS}[K[34C${DIM}[40m ` +
      `[4;11H${FOCUS}[K[34C${DIM}[40m ` +
      `[6;11H${NORMAL} □ OK ` +
      `[2;23H`
    );

    form.feed(Key.normal(0, "!"));
    form.feed(new Key(0, KeyType.Tab));
    escpaint(canvas).should.eql(
      `[12Dtest content![K[21C${DIM}[40m ` +
      `[3;11H${NORMAL}[K[34C${DIM}[40m ` +
      `[4;11H${NORMAL}[K[34C${DIM}[40m ` +
      `[6;11H${FOCUS} ■ OK ` +
      `[5D`
    );

    box.text.should.eql("test content!");
  });
});
