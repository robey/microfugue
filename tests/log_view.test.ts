import { Canvas } from "antsy";
import { LogView, RichText, wrapText } from "../src";

import "should";
import "source-map-support/register";

const escInline = (c: Canvas): string => c.paintInline().replace(/\u001b\[/g, "[");

describe("LogView", () => {
  it("wrapText", () => {
    const text1 = RichText.string("777", "turn off the television");
    wrapText(text1, 50).map(x => x.toString()).should.eql([ "{777:turn off the television}" ]);
    wrapText(text1, 20).map(x => x.toString()).should.eql([ "{777:turn off the }", "{777:television}" ]);
    wrapText(text1, 5).map(x => x.toString()).should.eql([
      "{777:turn }", "{777:off }", "{777:the }", "{777:telev}", "{777:ision}"
    ]);

    const text2 = RichText.string("777", "monosyllabicism");
    wrapText(text2, 10).map(x => x.toString()).should.eql([ "{777:monosyllab}", "{777:icism}" ]);
    wrapText(text2, 8).map(x => x.toString()).should.eql([ "{777:monosyll}", "{777:abicism}" ]);
  });

  it("add things at the bottom", () => {
    const canvas = new Canvas(20, 10);
    const view = new LogView(canvas);
    view.add("hello");
    view.add("second");
    escInline(canvas).should.eql("[40m[38;5;248mhello               [m\n[40m[38;5;248msecond              [m\n");
  });

  it("resizes horizontally", () => {
    const canvas = new Canvas(20, 10);
    const view = new LogView(canvas);
    view.add("turn off the television");
    view.add("second line");
    canvas.rows.should.eql(3);
    escInline(canvas).should.eql(
      "[40m[38;5;248mturn off the        [m\n" +
      "[40m[38;5;248mtelevision          [m\n" +
      "[40m[38;5;248msecond line         [m\n"
    );

    canvas.resize(11, canvas.rows);
    canvas.rows.should.eql(5);
    escInline(canvas).should.eql(
      "[40m[38;5;248mturn off   [m\n" +
      "[40m[38;5;248mthe        [m\n" +
      "[40m[38;5;248mtelevision [m\n" +
      "[40m[38;5;248msecond     [m\n" +
      "[40m[38;5;248mline       [m\n"
    );

    canvas.resize(25, canvas.rows);
    canvas.rows.should.eql(2);
    escInline(canvas).should.eql(
      "[40m[38;5;248mturn off the television  [m\n" +
      "[40m[38;5;248msecond line              [m\n"
    );
  });

  it("tells a ScrollView when old content is expiring", () => {
    const canvas = new Canvas(20, 10);
    const view = new LogView(canvas, { maxLines: 20 });
    const events: number[] = [];
    view.onContentMoved(translate => events.push(translate(10)));

    view.add("first");
    view.add("one line that's actually several lines because it will wrap a lot")
    for (let i = 0; i < 18; i++) view.add(`${i}`);
    events.should.eql([]);
    view.add("new line");
    events.should.eql([ 9 ]);
    view.add("newer line")
    events.should.eql([ 9, 6 ]);
  });

  it("translates the position of reflowed lines", () => {
    const canvas = new Canvas(20, 10);
    const view = new LogView(canvas, { maxLines: 20 });
    let passed = false;
    view.onContentMoved(translate => {
      translate(0).should.eql(0);
      translate(3).should.eql(0);
      translate(4).should.eql(0);
      translate(7).should.eql(0);
      translate(8).should.eql(4);
      passed = true;
    });

    // each line is actually 4 rows, so this makes 20.
    view.add("1 line that's actually several lines because it will wrap a lot");
    view.add("2 line that's actually several lines because it will wrap a lot");
    view.add("3 line that's actually several lines because it will wrap a lot");
    view.add("4 line that's actually several lines because it will wrap a lot");
    view.add("5 line that's actually several lines because it will wrap a lot");
    canvas.rows.should.eql(20);

    canvas.resize(21, canvas.rows);
    passed.should.eql(true);
  });

  it("allows custom color names", () => {
    const canvas = new Canvas(20, 10);
    const view = new LogView(canvas, { maxLines: 20, colorAliases: new Map([[ "mars", "f00" ] ]) });
    view.addText(RichText.parse("Welcome to {mars:Mars}", "777"));
    escInline(canvas).should.eql("[40m[38;5;243mWelcome to [38;5;9mMars[37m     [m\n");
  });

  it("adds blank lines", () => {
    const canvas = new Canvas(6, 10);
    const view = new LogView(canvas, { maxLines: 20 });
    view.addText(RichText.parse("start", "777"));
    view.addText(RichText.parse("", "777"));
    view.addText(RichText.parse("end", "777"));
    escInline(canvas).should.eql("[40m[38;5;243mstart [m\n[40m[38;5;243m      [m\n[40m[38;5;243mend   [m\n");
  });
});
