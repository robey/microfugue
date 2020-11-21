import "should";
import { Canvas, GridLayout, Key, KeyType } from "antsy";
import { Form, FormButton, FormEditBox, FormRow, FormText, RichText } from "..";

const RESET = `[37m[40m`;
const CLEAR = RESET + `[2J[H`;
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


describe("FormRow", () => {
  const ok = new FormButton(RichText.parse("OK"), () => null);
  const cancel = new FormButton(RichText.parse("Cancel"), () => null);

  it("focuses buttons", () => {
    const canvas = new Canvas(30, 8);
    const row = new FormRow([ ok, cancel ]);
    const form = new Form(
      canvas.all(),
      [ { component: row, label: "Done?" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;5H${LABEL}Done? ${FOCUS}▶ OK ◀${RESET}  ${NORMAL}  Cancel  [16D`
    );
    form.next();
    escpaint(canvas).should.eql(
      `[2D  OK  ${RESET}  ${FOCUS}▶ Cancel ◀[8D`
    );
  });

  it("focuses between rows", () => {
    let event = "";
    const canvas = new Canvas(45, 8);
    const abort = new FormButton(RichText.parse("Abort"), () => null);
    const retry = new FormButton(RichText.parse("Retry"), () => null);
    const fail = new FormButton(RichText.parse("Fail"), () => { event = "fail" });
    const row1 = new FormRow([ abort, retry, fail ]);
    const save = new FormButton(RichText.parse("Save"), () => null);
    const row2 = new FormRow([ save ]);
    const form = new Form(
      canvas.all(),
      [ { component: row1, label: "Error!" }, { component: row2 } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;4H${LABEL}Error! ` +
      `${FOCUS}▶ Abort ◀${RESET}  ${NORMAL}  Retry  ${RESET}  ${NORMAL}  Fail  ` +
      `[4;11H  Save  [2;13H`
    );
    form.next();
    form.next();
    escpaint(canvas).should.eql(
      `[2D  Abort  [13C${FOCUS}▶ Fail ◀[6D`
    );

    form.next();
    escpaint(canvas).should.eql(
      `[2D${NORMAL}  Fail  [4;11H${FOCUS}▶ Save ◀[6D`
    );

    form.prev();
    escpaint(canvas).should.eql(
      `[2;33H▶ Fail ◀[4;11H${NORMAL}  Save  [2;35H`
    );

    form.feed(Key.normal(0, " "));
    event.should.eql("fail");
  });

  it("wraps row", () => {
    const canvas = new Canvas(32, 8);
    const abort = new FormButton(RichText.parse("Abort"), () => null); // 9
    const retry = new FormButton(RichText.parse("Retry"), () => null); // 9
    const fail = new FormButton(RichText.parse("Fail"), () => null); // 8
    const row = new FormRow([ abort, retry, fail ]);
    const form = new Form(
      canvas.all(),
      [ { component: row, label: "Error!" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;4H${LABEL}Error! ` +
      `${FOCUS}▶ Abort ◀${RESET}  ${NORMAL}  Retry  [4;11H  Fail  [2;13H`
    );
    form.next();
    escpaint(canvas).should.eql(
      `[2D  Abort  ${RESET}  ${FOCUS}▶ Retry ◀[7D`
    );
    form.next();
    escpaint(canvas).should.eql(
      `[2D${NORMAL}  Retry  [4;11H${FOCUS}▶ Fail ◀[6D`
    );
  });

  it("makes each wrapped row as tall as the tallest component", () => {
    const canvas = new Canvas(32, 8);
    const one = new FormText(RichText.parse("word"), { constraint: GridLayout.fixed(5) });
    const two = new FormText(RichText.parse("two word"), { constraint: GridLayout.fixed(5) });
    const one7 = new FormText(RichText.parse("seven"), { constraint: GridLayout.fixed(7) });
    const three = new FormText(RichText.parse("three word line"), { constraint: GridLayout.fixed(7) });
    const row = new FormRow([ one, two, one7, three ]);
    const form = new Form(
      canvas.all(),
      [ { component: row, label: "Lines" } ],
      { left: GridLayout.fixed(10) },
    );

    form.canvas.cols.should.eql(31);
    form.canvas.rows.should.eql(7);
    (row.grid?.lefts ?? []).should.eql([ 0, 21 ]);
    (row.grid?.tops ?? []).should.eql([ 0, 3, 6 ]);

    escpaint(canvas).should.eql(
      `${CLEAR}[2;5H${LABEL}Lines ` +
      `[37mword   two    seven[3;18Hword` +
      `[5;11Hthree[6;11Hword[7;11Hline[2;11H`
    );
  });

  it("edit box with sub-label", async () => {
    const canvas = new Canvas(45, 8);
    const button = new FormButton(RichText.parse("Clear"), () => { box.content = ""; form.redraw(); });
    const box = new FormEditBox("test content", { minHeight: 3, maxHeight: 5 });
    const row = new FormRow([ button, box ]);
    const form = new Form(
      canvas.all(),
      [ { component: row, label: "Gripes" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;4H${LABEL}Gripes ` +
      `${FOCUS}▶ Clear ◀${RESET}  ` +
      `${NORMAL}test content[K[11C${DIM}[40m ` +
      `[3;22H${NORMAL}[K[23C${DIM}[40m ` +
      `[4;22H${NORMAL}[K[23C${DIM}[40m ` +
      `[2;13H`
    );

    form.feed(Key.normal(0, " "));
    escpaint(canvas).should.eql(
      `[9C${NORMAL}[K[23C${DIM}[40m [33D`
    );

    form.feed(new Key(0, KeyType.Tab));
    for (const ch of "hello") form.feed(Key.normal(0, ch));
    await delay(10);
    escpaint(canvas).should.eql(
      `[2D${NORMAL}  Clear  ${RESET}  ${FOCUS}hello[K[18C${DIM}[40m ` +
      `[3;22H${FOCUS}[K[23C${DIM}[40m ` +
      `[4;22H${FOCUS}[K[23C${DIM}[40m ` +
      `[2;27H`
    );
  });
});