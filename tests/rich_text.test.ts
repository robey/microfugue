import { RichText } from "../src";

import "should";
import "source-map-support/register";

describe("RichText", () => {
  it("flat", () => {
    const flat = RichText.string("777", "days of abandon");

    flat.at(0).should.eql("d");
    flat.at(3).should.eql("s");
    flat.at(6).should.eql("f");
    flat.at(13).should.eql("o");
    flat.at(15).should.eql("");

    flat.split(0).map(x => x.toString()).should.eql([ "{777:}", "{777:days of abandon}" ]);
    flat.split(3).map(x => x.toString()).should.eql([ "{777:day}", "{777:s of abandon}" ]);
    flat.split(6).map(x => x.toString()).should.eql([ "{777:days o}", "{777:f abandon}" ]);
    flat.split(13).map(x => x.toString()).should.eql([ "{777:days of aband}", "{777:on}" ]);
    flat.split(15).map(x => x.toString()).should.eql([ "{777:days of abandon}", "{777:}" ]);
  });

  it("multi-string", () => {
    const r = new RichText("777", [ "days ", "of", " abandon" ]);

    r.at(0).should.eql("d");
    r.at(3).should.eql("s");
    r.at(6).should.eql("f");
    r.at(13).should.eql("o");
    r.at(15).should.eql("");

    r.split(0).map(x => x.toString()).should.eql([ "{777:}", "{777:days of abandon}" ]);
    r.split(3).map(x => x.toString()).should.eql([ "{777:day}", "{777:s of abandon}" ]);
    r.split(6).map(x => x.toString()).should.eql([ "{777:days o}", "{777:f abandon}" ]);
    r.split(13).map(x => x.toString()).should.eql([ "{777:days of aband}", "{777:on}" ]);
    r.split(15).map(x => x.toString()).should.eql([ "{777:days of abandon}", "{777:}" ]);
  });

  it("nested", () => {
    const blue = RichText.string("blue", "of");
    const r = new RichText("777", [ "days ", blue, " abandon" ]);
    r.at(0).should.eql("d");
    r.at(3).should.eql("s");
    r.at(6).should.eql("f");
    r.at(13).should.eql("o");
    r.at(15).should.eql("");

    r.split(0).map(x => x.toString()).should.eql([ "{777:}", "{777:days {blue:of} abandon}" ]);
    r.split(3).map(x => x.toString()).should.eql([ "{777:day}", "{777:s {blue:of} abandon}" ]);
    r.split(6).map(x => x.toString()).should.eql([ "{777:days {blue:o}}", "{777:{blue:f} abandon}" ]);
    r.split(13).map(x => x.toString()).should.eql([ "{777:days {blue:of} aband}", "{777:on}" ]);
    r.split(15).map(x => x.toString()).should.eql([ "{777:days {blue:of} abandon}", "{777:}" ]);
  });

  it("deeply nested", () => {
    const blue = RichText.string("blue", "of");
    const red = RichText.string("red", "band");
    const bright = new RichText("888", [ "days ", blue, " a", red ]);
    const r = new RichText("777", [ bright, "on" ]);

    r.at(0).should.eql("d");
    r.at(3).should.eql("s");
    r.at(6).should.eql("f");
    r.at(13).should.eql("o");
    r.at(15).should.eql("");

    r.split(0).map(x => x.toString()).should.eql([ "{777:}", "{777:{888:days {blue:of} a{red:band}}on}" ]);
    r.split(3).map(x => x.toString()).should.eql([ "{777:{888:day}}", "{777:{888:s {blue:of} a{red:band}}on}" ]);
    r.split(6).map(x => x.toString()).should.eql([ "{777:{888:days {blue:o}}}", "{777:{888:{blue:f} a{red:band}}on}" ]);
    r.split(13).map(x => x.toString()).should.eql([ "{777:{888:days {blue:of} a{red:band}}}", "{777:on}" ]);
    r.split(15).map(x => x.toString()).should.eql([ "{777:{888:days {blue:of} a{red:band}}on}", "{777:}" ]);
  });

  it("parse", () => {
    RichText.parse("days of abandon", "777").toString().should.eql("{777:days of abandon}");
    RichText.parse("days {blue:of} abandon", "777").toString().should.eql("{777:days {blue:of} abandon}");
    RichText.parse("days \\{blue:of} abandon", "777").toString().should.eql("{777:days \\{blue:of\\} abandon}");
    RichText.parse("days {blue:of abandon", "777").toString().should.eql("{777:days {blue:of abandon}}");
    RichText.parse("days {of} abandon", "777").toString().should.eql("{777:days \\{of\\} abandon}");
    RichText.parse("days {of abandon", "777").toString().should.eql("{777:days \\{of abandon}");
    RichText.parse("days }of abandon", "777").toString().should.eql("{777:days \\}of abandon}");
    RichText.parse("days {blue:of} a{red:band}on", "777").toString().should.eql("{777:days {blue:of} a{red:band}on}");
    RichText.parse("days {blue:{red:of} aband}on", "777").toString().should.eql("{777:days {blue:{red:of} aband}on}");
    RichText.parse("{888:days of abandon}", "777").toString().should.eql("{888:days of abandon}");
    RichText.parse("{888:days of aband}on", "777").toString().should.eql("{777:{888:days of aband}on}");
    RichText.parse("{888:days {blue:of} a{red:band}}on", "777").toString().should.eql(
      "{777:{888:days {blue:of} a{red:band}}on}"
    );
    RichText.parse("{888:days {blue:of a{red:band{green:on", "777").toString().should.eql(
      "{888:days {blue:of a{red:band{green:on}}}}"
    );
    RichText.parse("}}}}", "777").toString().should.eql("{777:\\}\\}\\}\\}}");
    RichText.parse("hello {{name}}", "777").toString().should.eql("{777:hello \\{\\{name\\}\\}}");
  });

  it("findWordWrap", () => {
    const text1 = RichText.string("000", "turn off the television");
    (text1.findWordWrap(50) ?? -1).should.eql(50);
    (text1.findWordWrap(20) ?? -1).should.eql(13);
    (text1.findWordWrap(5) ?? -1).should.eql(5);

    const text2 = RichText.string("000", "monosyllabicism");
    (text2.findWordWrap(10) ?? -1).should.eql(-1);
    (text2.findWordWrap(8) ?? -1).should.eql(-1);

    // days of abandon
    const blue = RichText.string("blue", "of");
    const red = RichText.string("red", "band");
    const bright = new RichText("888", [ "days ", blue, " a", red ]);
    const r = new RichText("777", [ bright, "on" ]);
    (r.findWordWrap(50) ?? -1).should.eql(50);
    (r.findWordWrap(15) ?? -1).should.eql(15);
    (r.findWordWrap(14) ?? -1).should.eql(8);

    const r2 = RichText.parse("stop m{blue:onosyl{red:labici{black:cism}}}", "777");
    (r2.findWordWrap(20) ?? -1).should.eql(5);
  });
});
