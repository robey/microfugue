import "should";
import { Canvas, GridLayout, Key, KeyType, Modifier } from "antsy";
import { Form, FormButton, FormEditBox, FormSelector, FormText, RichText } from "..";

const RESET = `[37m[40m`;
const CLEAR = RESET + `[2J[H`;
const BLUE = `[38;5;12m`;
const RED = `[38;5;9m`;
const WHITE = `[38;5;15m`;
const PALE_BLUE = `[38;5;39m`;
const GRAY = `[38;5;246m`;
const BLUE_BG = `[44m`;
const RED_BG = `[41m`;
const GRAY_BG = `[48;5;236m`;
const DIM = `[38;5;243m`;
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

  it("computes custom vertical padding", () => {
    const canvas = new Canvas(25, 8);
    const c1 = new FormText(RichText.parse("{00f:blue}", "fff"));
    const c2 = new FormText(RichText.parse("{f00:red", "fff"));
    const form = new Form(
      canvas.all(),
      [ { component: c1, fullWidth: true, paddingBelow: 0 }, { component: c2, fullWidth: true, paddingBelow: 1 }, ],
      { verticalPadding: 2 }
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2B${BLUE}blue` +
      `[4H${RED}red[3H`
    );
    form.canvas.rows.should.eql(5);
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
      `[8D[40mDone? ${GRAY_BG}  OK  [4;11H${FOCUS}▶ Cancel ◀[8D`
    );

    // don't crash
    form.next();
    escpaint(canvas).should.eql("");

    form.prev();
    escpaint(canvas).should.eql(
      `[2;5H[40mDone? [44m▶ OK ◀[4;11H${NORMAL}  Cancel  [2;13H`
    );
  });

  it("remove", () => {
    const canvas = new Canvas(30, 8);
    const button1 = new FormButton(RichText.parse("OK"), () => null);
    const button2 = new FormButton(RichText.parse("Delete"), () => form.remove(button1));
    const form: Form = new Form(
      canvas.all(),
      [ { component: button1, label: "Done?" }, { component: button2, label: "Uh-oh" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;5H${WHITE}Done? ${BLUE_BG}▶ OK ◀` +
      `[4;5H${GRAY}[40mUh-oh ${GRAY_BG}  Delete  ` +
      `[2;13H`
    );

    form.feed(new Key(0, KeyType.Tab));
    form.feed(Key.normal(0, " "));
    escpaint(canvas).should.eql(
      `[8D${WHITE}[40mUh-oh ${BLUE_BG}▶ Delete ◀` +
      `[4H${RESET}[K[2;13H`
    );
  });

  it("remove focused", () => {
    const canvas = new Canvas(30, 8);
    const button1: FormButton = new FormButton(RichText.parse("OK"), () => form.remove(button1));
    const button2 = new FormButton(RichText.parse("Delete"), () => null);
    const form: Form = new Form(
      canvas.all(),
      [ { component: button1, label: "Done?" }, { component: button2, label: "Uh-oh" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;5H${WHITE}Done? ${BLUE_BG}▶ OK ◀` +
      `[4;5H${GRAY}[40mUh-oh ${GRAY_BG}  Delete  ` +
      `[2;13H`
    );

    form.feed(Key.normal(0, " "));
    escpaint(canvas).should.eql(
      `[8D${WHITE}[40mUh-oh ${BLUE_BG}▶ Delete ◀` +
      `[4H${RESET}[K[2;13H`
    );
  });

  it("insert", () => {
    const canvas = new Canvas(30, 8);
    const button1 = new FormButton(RichText.parse("OK"), () => {
      form.insertBefore(button3, { component: button2 });
    });
    const button2 = new FormButton(RichText.parse("New!"), () => null);
    const button3 = new FormButton(RichText.parse("Delete"), () => null);
    const form: Form = new Form(
      canvas.all(),
      [ { component: button1, label: "Done?" }, { component: button3, label: "Uh-oh" } ],
      { left: GridLayout.fixed(10) },
    );

    escpaint(canvas).should.eql(
      `${CLEAR}[2;5H${WHITE}Done? ${BLUE_BG}▶ OK ◀` +
      `[4;5H${GRAY}[40mUh-oh ${GRAY_BG}  Delete  ` +
      `[2;13H`
    );

    form.feed(Key.normal(0, " "));
    escpaint(canvas).should.eql(
      `[4H${RESET}[K[10C${NORMAL}  New!  ` +
      `[6;5H[40mUh-oh ${GRAY_BG}  Delete  ` +
      `[2;13H`
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
        `[19D[40mGripes ${GRAY_BG}test content![K[21C${DIM}[40m ` +
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

    it("forbids errors", () => {
      const canvas = new Canvas(30, 8);
      const button = new FormButton(RichText.parse("OK"), () => null);
      const box: FormEditBox = new FormEditBox(
        "test content",
        { minHeight: 1, maxHeight: 3, allowBlur: () => box.text == "hello" }
      );
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

      form.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(
        `[12D${WHITE}${RED_BG}test content       [7D`
      );

      form.feed(new Key(0, KeyType.Home));
      form.feed(Key.normal(Modifier.Control, "K"));
      for (const ch of "hello") form.feed(Key.normal(0, ch));
      form.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(
        `[20D${GRAY}[40mGripes  ${GRAY_BG}hello[K[14C${DIM}[40m ` +
        `[4;11H${FOCUS}▶ OK ◀[4D`
      );
    });

    it("shows suggestions", () => {
      const suggestions = [ "raccoon", "rabbit" ];

      const canvas = new Canvas(30, 8);
      const autoComplete = (text: string) => suggestions.filter(s => s.startsWith(text)).map(s => s.slice(text.length));
      const box: FormEditBox = new FormEditBox(
        "",
        { minHeight: 1, maxHeight: 1, minWidth: 10, maxLength: 10, alwaysSuggest: true, autoComplete },
      );
      const form = new Form(
        canvas.all(),
        [ { component: box, label: "Animal:" } ],
        { left: GridLayout.fixed(10), labelSpacing: 2 },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[2;2H${WHITE}Animal:  ` +
        `${BLUE_BG}          [10D`
      );

      form.feed(Key.normal(0, "r"));
      form.feed(Key.normal(0, "a"));
      escpaint(canvas).should.eql(`ra${DIM}ccoon[5D`);

      form.feed(Key.normal(0, "b"));
      escpaint(canvas).should.eql(`${WHITE}b${DIM}bit${WHITE} [4D`);

      form.feed(new Key(0, KeyType.Right));
      escpaint(canvas).should.eql(`bit`);
    });
  });


  describe("selector", () => {
    const commonChoices = [ "first", "second", "third" ].map(s => RichText.parse(s));

    it("focus", () => {
      const canvas = new Canvas(30, 8);
      const text = new FormText(RichText.parse("filler"), { acceptsFocus: true });
      const selector = new FormSelector(commonChoices, [ 0 ]);
      const form = new Form(
        canvas.all(),
        [ { component: text }, { component: selector } ],
        { left: GridLayout.fixed(10), labelSpacing: 2 },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[2;11H${GRAY}filler` +
        `[4;11H${GRAY_BG}   first   ` +
        `[2;11H`
      );

      form.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(
        `[2B${PALE_BLUE}${BLUE_BG}▶${WHITE}  first  ${PALE_BLUE}◀[10D`
      );
    });

    it("activate", async () => {
      const canvas = new Canvas(30, 8);
      const text1 = new FormText(RichText.parse("filler"), { acceptsFocus: true });
      const selector = new FormSelector(commonChoices, [ 0 ]);
      const text2 = new FormText(RichText.parse("moar filler"), { acceptsFocus: true });
      const form = new Form(
        canvas.all(),
        [ { component: text1 }, { component: selector }, { component: text2 } ],
        { left: GridLayout.fixed(10), labelSpacing: 2 },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[2;11H${GRAY}filler` +
        `[4;11H${GRAY_BG}   first   ` +
        `[6;11H[40mmoar filler` +
        `[2;11H`
      );

      form.feed(new Key(0, KeyType.Tab));
      form.feed(Key.normal(0, " "));
      escpaint(canvas).should.eql(
        `[2B${PALE_BLUE}${BLUE_BG}▶${WHITE}✓ first  ${PALE_BLUE}◀` +
        `[5;11H   second  ` +
        `[6;11H   third   ` +
        `[4;12H`
      );

      form.feed(new Key(0, KeyType.Down));
      escpaint(canvas).should.eql(
        `[D ✓ first   ` +
        `[5;11H▶${WHITE}  second ${PALE_BLUE}◀` +
        `[10D`
      );

      form.feed(new Key(0, KeyType.Down));
      escpaint(canvas).should.eql(
        `[D   second  ` +
        `[6;11H▶${WHITE}  third  ${PALE_BLUE}◀` +
        `[10D`
      );

      form.feed(Key.normal(0, " "));
      escpaint(canvas).should.eql(
        `[2A ` +
        `[6;12H${WHITE}✓[D`
      );
    });

    it("keeps display on selected item", () => {
      const canvas = new Canvas(30, 8);
      const selector = new FormSelector(commonChoices, [ 0 ]);
      const button = new FormButton(RichText.parse("OK"), () => null);

      const form = new Form(
        canvas.all(),
        [ { component: selector }, { component: button } ],
        { left: GridLayout.fixed(10), labelSpacing: 2 },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[2;11H${PALE_BLUE}${BLUE_BG}▶${WHITE}  first  ${PALE_BLUE}◀` +
        `[4;11H${NORMAL}  OK  ` +
        `[2;12H`
      );

      // space, down, esc -- should revert to selected
      form.feed(Key.normal(0, " "));
      form.feed(new Key(0, KeyType.Down));
      form.feed(new Key(0, KeyType.Esc));
      escpaint(canvas).should.eql("");

      form.feed(Key.normal(0, " "));
      form.feed(new Key(0, KeyType.Down));
      form.feed(new Key(0, KeyType.Tab));
      escpaint(canvas).should.eql(`[D   first   [4;11H${FOCUS}▶ OK ◀[4D`);
    });

    it("multi-select", () => {
      const canvas = new Canvas(30, 8);
      const text1 = new FormText(RichText.parse("filler"), { acceptsFocus: true });
      const selector = new FormSelector(commonChoices, [ 0 ], { multiSelect: true });
      const text2 = new FormText(RichText.parse("moar filler"), { acceptsFocus: true });
      const form = new Form(
        canvas.all(),
        [ { component: text1 }, { component: selector }, { component: text2 } ],
        { left: GridLayout.fixed(10), labelSpacing: 2 },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[2;11H${GRAY}filler` +
        `[4;11H${GRAY_BG} ✓ first   ` +
        `[6;11H[40mmoar filler` +
        `[2;11H`
      );

      form.feed(new Key(0, KeyType.Tab));
      form.feed(Key.normal(0, " "));
      form.feed(new Key(0, KeyType.Down));
      form.feed(new Key(0, KeyType.Down));
      form.feed(Key.normal(0, " "));
      escpaint(canvas).should.eql(
        `[2B${PALE_BLUE}${BLUE_BG} ✓ first   ` +
        `[5;11H   second  ` +
        `[6;11H▶${WHITE}✓ third  ${PALE_BLUE}◀` +
        `[10D`
      );
    });

    it("too big for canvas", () => {
      const choices = [ "first", "second", "third", "fourth", "fifth", "sixth" ].map(s => RichText.parse(s));

      const canvas = new Canvas(30, 5);
      const selector = new FormSelector(choices, [ ], { multiSelect: true });
      const form = new Form(
        canvas.all(),
        [ { component: selector } ],
        { left: GridLayout.fixed(10), labelSpacing: 2, verticalPadding: 2 },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[3;11H${PALE_BLUE}${BLUE_BG}▶${WHITE}  first  ${PALE_BLUE}◀[10D`
      );

      form.feed(Key.normal(0, " "));
      escpaint(canvas).should.eql(
        `[4;11H   second  [5;11H   …       [3;12H`
      );

      form.feed(new Key(0, KeyType.Down));
      form.feed(new Key(0, KeyType.Down));
      escpaint(canvas).should.eql(
        `[2;11H   first   [3;11H   second  [4;11H▶${WHITE}  third  ${PALE_BLUE}◀[10D`
      );

      form.feed(new Key(0, KeyType.Down));
      form.feed(new Key(0, KeyType.Down));
      escpaint(canvas).should.eql(
        `[1;11H   …       [2;14Hthird[3;14Hfourth[4;14H${WHITE}fifth[7D`
      );

      form.feed(new Key(0, KeyType.Down));
      escpaint(canvas).should.eql(
        `[2;14H${PALE_BLUE}fourth[3;15Hifth [4;14H${WHITE}six[5H${PALE_BLUE}[40m[K[4;12H`
      );

      form.feed(new Key(0, KeyType.Up));
      escpaint(canvas).should.eql(
        `[3;11H${BLUE_BG}▶${WHITE}  fifth  ${PALE_BLUE}◀[4;11H   sixth   [3;12H`
      );
    });

    it("too big for scroll view", () => {
      const choices = [ "first", "second", "third", "fourth", "fifth", "sixth" ].map(s => RichText.parse(s));

      const canvas = new Canvas(30, 4);
      const text1 = new FormText(RichText.parse("filler"));
      const selector = new FormSelector(choices, [ 0 ], { multiSelect: true });
      const text2 = new FormText(RichText.parse("moar filler down the screen"));
      const form = new Form(
        canvas.all(),
        [ { component: text1 }, { component: selector }, { component: text2 } ],
        { left: GridLayout.fixed(10), labelSpacing: 2 },
      );

      escpaint(canvas).should.eql(
        `${CLEAR}[10C${GRAY}filler[13C${DIM}│` +
        `[2;30H█` +
        `[3;11H${PALE_BLUE}${BLUE_BG}▶${WHITE}✓ first  ${PALE_BLUE}◀[8C${DIM}[40m█` +
        `[4;30H│` +
        `[3;12H`
      );

      form.feed(Key.normal(0, " "));
      escpaint(canvas).should.eql(
        `[4;11H${PALE_BLUE}${BLUE_BG}   second  [3;12H`
      );

      form.feed(new Key(0, KeyType.Down));
      form.feed(new Key(0, KeyType.Down));
      form.feed(new Key(0, KeyType.Down));
      escpaint(canvas).should.eql(
        `[1;11H   second  ` +
        `[2;11H   third   ${GRAY}[40m down   ${DIM}│` +
        `[3;12H${WHITE}${BLUE_BG}  fourth` +
        `[4;14H${PALE_BLUE}…     [10C${DIM}[40m█` +
        `[3;12H`
      );

      form.feed(new Key(0, KeyType.Down));
      escpaint(canvas).should.eql(
        `[1;14H${PALE_BLUE}${BLUE_BG}third [2;14Hfourth[3;15H${WHITE}ifth [8D`
      );
    });
  });
});
