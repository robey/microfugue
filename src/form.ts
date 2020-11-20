import { Canvas, Constraint, GridLayout, Key, KeyType, Modifier, Region } from "antsy";
import { lpad } from "./rich_text";
import { ScrollView, ScrollViewConfig } from "./scroll_view";

export { FormButton, FormButtonConfig } from "./form/form_button";
export { FormEditBox, FormEditBoxConfig } from "./form/form_edit_box";
export { FormText, FormTextConfig } from "./form/form_text";

export interface FormConfig {
  // constraints to use for the left column (labels) and right column (components)
  left: Constraint;
  right: Constraint;

  // label colors on the left
  labelColor: string;
  labelBackground: string;
  labelFocusColor: string;
  labelFocusBackground: string;

  // how many spaces between the label and the component?
  labelSpacing: number;

  // override the scroll bar display
  scrollViewConfig: Partial<ScrollViewConfig>;

  // how many blank lines should separate each component?
  verticalPadding: number;
}

const DEFAULT_CONFIG: FormConfig = {
  left: GridLayout.fixed(20),
  right: GridLayout.stretch(1),
  labelColor: "777",
  labelBackground: "000",
  labelFocusColor: "ccc",
  labelFocusBackground: "000",
  labelSpacing: 1,
  scrollViewConfig: { gravityIsTop: true },
  verticalPadding: 1,
};

// things that can be in a form
export interface FormComponent {
  // can this component interact? or is it passive?
  acceptsFocus: boolean;

  // given this region width, how many rows do you need?
  computeHeight(width: number): number;

  // draw the component from scratch. when focused, please move the cursor too.
  draw(region: Region, form: Form): void;

  // want to find out when you're focused?
  takeFocus?(direction: number): void;
  loseFocus?(direction: number): void;

  // will receive key events when focused
  feed?(key: Key, form: Form): void;

  // has internal focus management? return true if focus should remain within this component.
  shiftFocus?(direction: number): boolean;
}

// a form is composed of these fields, stacked vertically.
// each field is an optional label and a component
export interface FormField {
  // label sits in the left column, right-justified
  label?: string;

  // a full-width field will use the entire width for the component, ignoring the label
  fullWidth?: boolean;

  // the component handles drawing and interactions
  component: FormComponent;
}


// vertical stack of input components
export class Form {
  config: FormConfig;
  scrollView: ScrollView;
  canvas: Canvas;
  layout: GridLayout;
  focus = 0;

  // clip regions for each component (and optional label)
  labelRegions: Region[];
  regions: Region[];

  constructor(public region: Region, public fields: FormField[], options: Partial<FormConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_CONFIG, options);
    this.config.scrollViewConfig = Object.assign({}, DEFAULT_CONFIG.scrollViewConfig, options.scrollViewConfig);
    this.scrollView = new ScrollView(region, this.config.scrollViewConfig);
    this.canvas = this.scrollView.content;
    this.canvas.resize(this.canvas.cols, this.fields.length);

    // find first focus-able component and give it focus
    if (!this.fields[this.focus].component.acceptsFocus) this.focus = this.getNextFocus();
    this.tellFocus(this.focus, true, 1);

    // make a grid with 1-height rows first, then resize for real, once we know the column widths
    const cols = [ this.config.left, this.config.right ];
    const fakeRows = fields.map(_ => GridLayout.fixed(1));
    // extra row for the top margin (if any)
    fakeRows.push(GridLayout.fixed(this.config.verticalPadding));
    this.layout = new GridLayout(this.canvas.all(), cols, fakeRows);
    this.regions = this.fields.map((f, i) => this.layout.layout(f.fullWidth ? 0 : 1, i + 1, 2, i + 2));
    this.labelRegions = this.fields.map((_, i) => this.layout.layout(0, i + 1, 1, i + 2));
    this.redraw();
  }

  redraw() {
    // top grid row is vertical padding; the rest of the padding is the last row of each component
    const heights = this.fields.map((f, i) => {
      return f.component.computeHeight(this.regions[i].cols) + this.config.verticalPadding;
    });
    heights.unshift(this.config.verticalPadding);
    const height = heights.reduce((sum, b) => sum + b, 0);
    this.canvas.resize(this.canvas.cols, height);

    const cols = [ this.config.left, this.config.right ];
    this.layout.update(cols, heights.map(y => GridLayout.fixed(y)));

    const labelWidth = this.labelRegions[0].cols - this.config.labelSpacing;
    this.fields.forEach((f, i) => {
      if (!f.fullWidth && f.label !== undefined) {
        let label = f.label;
        if (label.length > labelWidth) label = label.slice(0, labelWidth - 1) + "…";
        this.labelRegions[i].backgroundColor(this.config.labelBackground).clear().color(
          i == this.focus ? this.config.labelFocusColor : this.config.labelColor,
          i == this.focus ? this.config.labelFocusBackground : this.config.labelBackground,
        ).clear().at(0, 0).write(lpad(label, labelWidth));
      }

      // clear out vertical space:
      this.regions[i].backgroundColor(this.config.labelBackground).clear();
      f.component.draw(this.regions[i], this);
    });
    this.ensureFocus();
  }

  feed(key: Key) {
    // first, handle focus change (tab, S-tab, C-up, C-down)
    if (key.modifiers == 0) {
      switch (key.type) {
        case KeyType.Tab:
          return this.next();
      }
    } else if (key.modifiers == Modifier.Shift) {
      switch (key.type) {
        case KeyType.Tab:
          return this.prev();
      }
    } else if (key.modifiers == Modifier.Control) {
      switch (key.type) {
        case KeyType.Up:
          return this.prev();
        case KeyType.Down:
          return this.next();
      }
    }

    const component = this.fields[this.focus].component;
    if (component.feed) component.feed(key, this);
  }

  // keep focus on screen
  private ensureFocus() {
    const top = this.regions[this.focus].y1;
    const bottom = this.regions[this.focus].y2;
    if (this.scrollView.frameTop > top) {
      this.scrollView.scrollUp(this.scrollView.frameTop - top);
    } else if (this.scrollView.frameBottom < bottom) {
      // "else" so we don't kill ourselves trying to fit on-screen
      this.scrollView.scrollDown(bottom - this.scrollView.frameBottom);
    }

    this.scrollView.redraw();
    this.scrollView.setCursor();
  }

  private getNextFocus(): number {
    const component = this.fields[this.focus].component;
    if (component.shiftFocus && component.shiftFocus(1)) return this.focus;
    let focus = this.focus + 1;
    while (focus < this.fields.length && !this.fields[focus].component.acceptsFocus) focus++;
    return focus < this.fields.length ? focus : this.focus;
  }

  private getPrevFocus(): number {
    const component = this.fields[this.focus].component;
    if (component.shiftFocus && component.shiftFocus(-1)) return this.focus;
    let focus = this.focus - 1;
    while (focus >= 0 && !this.fields[focus].component.acceptsFocus) focus++;
    return focus >= 0 ? focus : this.focus;
  }

  private tellFocus(index: number, take: boolean, direction: number) {
    const component = this.fields[index].component;
    if (take && component.takeFocus) component.takeFocus(direction);
    if (!take && component.loseFocus) component.loseFocus(direction);
  }

  next() {
    const oldFocus = this.focus;
    this.focus = this.getNextFocus();
    if (oldFocus != this.focus) {
      this.tellFocus(oldFocus, false, 1);
      this.tellFocus(this.focus, true, 1);
      this.fields[oldFocus].component.draw(this.regions[oldFocus], this);
    }
    this.fields[this.focus].component.draw(this.regions[this.focus], this);
    this.ensureFocus();
  }

  prev() {
    const oldFocus = this.focus;
    this.focus = this.getPrevFocus();
    if (oldFocus != this.focus) {
      this.tellFocus(oldFocus, false, -1);
      this.tellFocus(this.focus, true, -1);
      this.fields[oldFocus].component.draw(this.regions[oldFocus], this);
    }
    this.fields[this.focus].component.draw(this.regions[this.focus], this);
    this.ensureFocus();
  }
}
