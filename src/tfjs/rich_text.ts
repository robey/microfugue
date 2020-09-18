type Span = RichText | string;

export class RichText {
  constructor(public color: string, public spans: Span[]) {
    // pass
  }

  static string(color: string, s: string): RichText {
    return new RichText(color, [ s ]);
  }

  // parse a string with a simple color markup:
  //   - `{color:...}` will mark a section as being in a color
  //   - can be nested
  //   - `\{` avoids this parsing
  static parse(s: string, defaultColor: string): RichText {
    let i = 0;
    const end = s.length;
    let spans: Span[] = [];
    const colorStack: string[] = [];
    const spanStack: Span[][] = [];

    // return the next chunk of text that ends with either the end, or a
    // start of a new segment
    const nextText = (quoting: boolean = false) => {
      const start = i;
      while (i < end && (s[i] != "{" && s[i] != "}") || quoting) {
        quoting = (!quoting && s[i] == "\\");
        i++;
      }
      if (start == i) return undefined;
      return s.slice(start, i).replace(/\\\{/g, "{");
    };

    // return the color name in a `{color:` segment, or undefined if it's
    // not a color segment.
    const nextColor = () => {
      const start = i;
      i++;
      while (i < end && i - start < 10 && s[i].match(/[A-Za-z0-9]/)) i++;
      if (s[i] != ":") {
        // we goofed. probably just a `{string`, or maybe `{{macro}}`.
        i = start;
        return undefined;
      }
      i++;
      return s.slice(start + 1, i - 1);
    };

    const popState = () => {
      const color = colorStack.pop() ?? "";
      const span = new RichText(color, spans);
      spans = spanStack.pop() ?? [];
      spans.push(span);
    };

    let quoting = false;
    while (i < end) {
      const text = nextText(quoting);
      quoting = false;

      if (text !== undefined) spans.push(text);
      if (i == end) continue;
      if (s[i] == "}") {
        if (colorStack.length == 0 || spanStack.length == 0) {
          // spurious `}`
          quoting = true;
          continue;
        }
        popState();
        i++;
      } else {
        // "{"
        const color = nextColor();
        if (color == undefined) {
          // spurious `{`
          quoting = true;
          continue;
        }
        colorStack.push(color);
        spanStack.push(spans);
        spans = [];
      }
    }

    // just assume they "meant" to have trailing `}`
    while (colorStack.length > 0) popState();
    // if we only built one span, return it, and ignore the default color
    if (spans.length == 1 && spans[0] instanceof RichText) return spans[0];

    return new RichText(defaultColor, spans);
  }

  toString(): string {
    const quote = (s: Span) => {
      if (s instanceof RichText) return s.toString();
      return s.replace(/(?<!\\)\{/g, "\\{").replace(/(?<!\\)\}/g, "\\}");
    };
    return `{${this.color}:${this.spans.map(quote).join("")}}`;
  }

  get length(): number {
    return this.spans.reduce((sum, x) => sum + x.length, 0);
  }

  // returns [ span index, offset within span ]
  private findIndex(n: number): [ number, number ] {
    let sum = 0;
    for (let i = 0; i < this.spans.length; i++) {
      const len = this.spans[i].length;
      if (n < sum + len) return [ i, n - sum ];
      sum += len;
    }
    // past end of string
    return [ -1, -1 ];
  }

  at(n: number): string {
    const [ index, offset ] = this.findIndex(n);
    if (index == -1) return "";
    const r = this.spans[index];
    return (typeof r === "string") ? r[offset] : r.at(offset);
  }

  split(n: number): [ RichText, RichText ] {
    const [ index, offset ] = this.findIndex(n);
    if (index == -1) return [ this, RichText.string(this.color, "") ];
    const r = this.spans[index];
    const [ left, right ] = (typeof r === "string") ?
      [ r.slice(0, offset), r.slice(offset) ] : r.split(offset);
    const rLeft = this.spans.slice(0, index);
    const rRight = this.spans.slice(index + 1);
    if (left.length > 0) rLeft.push(left);
    if (right.length > 0) rRight.unshift(right);
    return [ new RichText(this.color, rLeft), new RichText(this.color, rRight) ];
  }

  findWordWrap(width: number): number | undefined {
    let [ index, offset ] = this.findIndex(width);
    if (index < 0) return width;
    // our candidate position, overall, so far:
    let n = width;

    while (true) {
      const s = this.spans[index];
      if (typeof s === "string") {
        while (offset >= 0 && !s[offset].match(/[-\s]/)) offset--, n--;
        if (offset >= 0) return n + 1;
      } else {
        const i = s.findWordWrap(offset);
        if (i !== undefined) return n - offset + i;
        n -= offset + 1;
      }

      if (index == 0) return undefined;

      // continue from the final char in the previous span
      index--;
      offset = this.spans[index].length - 1;
    }
  }
}
