import "should";
import { Canvas, GridLayout, Key, KeyType, Modifier } from "antsy";
import { Form, FormButtons, FormText, RichText } from "..";

const RESET = `[37m[40m`;
const CLEAR = RESET + `[2J[H`;
const BLUE = `[38;5;12m`;
const RED = `[38;5;9m`;
const WHITE = `[38;5;15m`;
const BLUE_BG = `[44m`;
const GRAY_BG = `[48;5;240m`;
const DIM = `[38;5;243m`;
const LABEL = `[38;5;252m`;
const FOCUS_BUTTON = WHITE + BLUE_BG;
const BUTTON = WHITE + GRAY_BG;

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
      `${CLEAR}[2;5H${LABEL}Done? ${FOCUS_BUTTON} ■ OK ${RESET}  ${BUTTON} □ Cancel [17D`
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
      `${CLEAR}[2;5H${LABEL}Done? ${FOCUS_BUTTON} ■ OK ${RESET}  ${BUTTON} □ Cancel [17D`
    );
    form.next();
    escpaint(canvas).should.eql(
      `[D □ OK ${RESET}  ${FOCUS_BUTTON} ■ Cancel [9D`
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
      `${FOCUS_BUTTON} ■ Abort ${RESET}  ${BUTTON} □ Retry ${RESET}  ${BUTTON} □ Fail ` +
      `[4;11H □ Save [2;12H`
    );
    form.next();
    form.next();
    escpaint(canvas).should.eql(
      `[D □ Abort [13C${BLUE_BG} ■ Fail [7D`
    );

    form.next();
    escpaint(canvas).should.eql(
      `[D${GRAY_BG} □ Fail [4;11H${BLUE_BG} ■ Save [7D`
    );

    form.prev();
    escpaint(canvas).should.eql(
      `[2;33H ■ Fail [4;11H${GRAY_BG} □ Save [2;34H`
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
})
