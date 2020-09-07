import { Canvas } from "antsy";
import { wrapText, LogView } from "../tfjs/log_view";

import "should";
import "source-map-support/register";

const escInline = (c: Canvas): string => c.paintInline().replace(/\u001b\[/g, "[");

describe("LogView", () => {
  it("wrapText", () => {
    const text1 = "turn off the television";
    wrapText(text1, 50).should.eql([ text1 ]);
    wrapText(text1, 20).should.eql([ "turn off the ", "television" ]);
    wrapText(text1, 5).should.eql([ "turn ", "off ", "the ", "tele-", "visi-", "on" ]);

    wrapText("monosyllabicism", 10).should.eql([ "monosylla-", "bicism" ]);
    wrapText("monosyllabicism", 8).should.eql([ "monosyl-", "labicism" ]);
  });

  it("add things at the bottom", () => {
    const canvas = new Canvas(20, 10);
    const view = new LogView(canvas);
    view.add("hello");
    view.add("second");
    escInline(canvas).should.eql("[40m[37mhello               [m\n[40m[37msecond              [m\n");
  });

  it("resizes horizontally", () => {
    const canvas = new Canvas(20, 10);
    const view = new LogView(canvas);
    view.add("turn off the television");
    view.add("second line");
    canvas.rows.should.eql(3);
    escInline(canvas).should.eql(
      "[40m[37mturn off the        [m\n" +
      "[40m[37mtelevision          [m\n" +
      "[40m[37msecond line         [m\n"
    );

    canvas.resize(10, canvas.rows);
    canvas.rows.should.eql(5);
    escInline(canvas).should.eql(
      "[40m[37mturn off  [m\n" +
      "[40m[37mthe       [m\n" +
      "[40m[37mtelevision[m\n" +
      "[40m[37msecond    [m\n" +
      "[40m[37mline      [m\n"
    );

    canvas.resize(25, canvas.rows);
    canvas.rows.should.eql(2);
    escInline(canvas).should.eql(
      "[40m[37mturn off the television  [m\n" +
      "[40m[37msecond line              [m\n"
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
});
