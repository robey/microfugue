import { Canvas, Constraint, GridLayout, Key, KeyType, Modifier, Region } from "antsy";
import { lpad } from "./rich_text";
import { ScrollView, ScrollViewConfig } from "./scroll_view";

export { FormButton, FormButtonConfig } from "./form/form_button";
import { COLOR_BG, COLOR_FG, COLOR_FG_FOCUS } from "./form/form_colors";
export { FormEditBox, FormEditBoxConfig } from "./form/form_edit_box";
export { FormRow, FormRowConfig } from "./form/form_row";
export { FormSelector, FormSelectorConfig } from "./form/form_selector";
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
  labelColor: COLOR_FG,
  labelBackground: COLOR_BG,
  labelFocusColor: COLOR_FG_FOCUS,
  labelFocusBackground: COLOR_BG,
  labelSpacing: 1,
  scrollViewConfig: { gravityIsTop: true },
  verticalPadding: 1,
};

// things that can be in a form
export interface FormComponent {
  // can this component interact? or is it passive?
  acceptsFocus: boolean;

  // what's an acceptable width, if this component were stacked in a row with others?
  constraint: Constraint;

  // given this region width, how many rows do you need?
  computeHeight(width: number): number;

  // assign a form and a region to draw into. may be called multiple times on radical reflow.
  attach(region: Region, form: Form): void;

  // draw the component from scratch. when focused, please move the cursor too.
  draw(): void;

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

  // use custom padding below this component?
  paddingBelow?: number;

  // the component handles drawing and interactions
  component: FormComponent;
}


// vertical stack of input components
export class Form {
  config: FormConfig;
  scrollView: ScrollView;
  canvas: Canvas;
  layout!: GridLayout;
  focus = -1;

  // clip regions for each component (and optional label)
  labelRegions!: Region[];
  regions!: Region[];

  // allow custom key bindings
  customBindings: [ Key, (key: Key, form: Form) => void ][] = [];

  constructor(public region: Region, public fields: FormField[], options: Partial<FormConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_CONFIG, options);
    this.config.scrollViewConfig = Object.assign({}, DEFAULT_CONFIG.scrollViewConfig, options.scrollViewConfig);
    this.scrollView = new ScrollView(region, this.config.scrollViewConfig);
    this.canvas = this.scrollView.content;

    // find first focus-able component and give it focus.
    // if none are focus-able, force the first component to be "it".
    this.focus = 0;
    if (this.fields.some(f => f.component.acceptsFocus)) {
      while (this.focus < this.fields.length && !this.fields[this.focus].component.acceptsFocus) {
        this.focus++;
      }
    }
    this.fields[this.focus].component.takeFocus?.(1);

    this.resize();
  }

  resize() {
    this.canvas.resize(this.canvas.cols, this.fields.length + 1);

    // make a grid with 1-height rows first, then resize for real, once we know the column widths
    const cols = [ this.config.left, this.config.right ];
    const fakeRows = this.fields.map(_ => GridLayout.fixed(1));
    // extra row for the top margin (if any)
    fakeRows.push(GridLayout.fixed(1));
    if (this.layout) this.layout.detach();
    this.layout = new GridLayout(this.canvas.all(), cols, fakeRows);
    this.labelRegions = this.fields.map((_, i) => this.layout.layout(0, i + 1, 1, i + 2));
    this.regions = [];
    this.fields.forEach((f, i) => {
      const region = this.layout.layout(f.fullWidth ? 0 : 1, i + 1, 2, i + 2);
      f.component.attach(region, this);
      this.regions.push(region);
    });

    // top grid row is vertical padding; the rest of the padding is the last row of each component
    const heights = this.fields.map((f, i) => {
      const h = f.component.computeHeight(this.regions[i].cols);
      // even if your height is 0, if you have a label, you've got 1 line
      return Math.max(h, f.label !== undefined ? 1 : 0) +
        (f.paddingBelow === undefined ? this.config.verticalPadding : f.paddingBelow);
    });
    heights.unshift(this.config.verticalPadding);
    const height = heights.reduce((sum, b) => sum + b, 0);
    this.canvas.resize(this.canvas.cols, height);

    this.layout.update(cols, heights.map(y => GridLayout.fixed(y)));

    this.redraw();
  }

  redraw() {
    this.canvas.all().backgroundColor(this.config.labelBackground).clear();

    const labelWidth = this.labelRegions[0].cols - this.config.labelSpacing;
    this.fields.forEach((f, i) => {
      if (!f.fullWidth && f.label !== undefined) {
        let label = f.label;
        if (label.length > labelWidth) label = label.slice(0, labelWidth - 1) + "…";
        this.labelRegions[i].backgroundColor(this.config.labelBackground).color(
          i == this.focus ? this.config.labelFocusColor : this.config.labelColor,
          i == this.focus ? this.config.labelFocusBackground : this.config.labelBackground,
        ).clear().at(0, 0).write(lpad(label, labelWidth));
      }

      // clear out vertical space:
      this.regions[i].backgroundColor(this.config.labelBackground).clear();
      if (this.focus != i) f.component.draw();
    });

    // draw the focused component last, in case it's using a custom region:
    this.fields[this.focus].component.draw();
    this.ensureFocus();
  }

  feed(key: Key) {
    for (const [ k, f ] of this.customBindings) if (key.equals(k)) {
      f(key, this);
      return;
    }

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
    this.ensureFocus();
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

    const [ _cx, cy ] = this.canvas.cursor;
    if (this.scrollView.frameTop > cy - 1) this.scrollView.scrollUp(this.scrollView.frameTop - cy + 1);
    if (this.scrollView.frameBottom < cy + 2) this.scrollView.scrollDown(this.scrollView.frameBottom - cy + 2);

    this.scrollView.redraw();
    this.scrollView.setCursor();
  }

  private shiftFocus(direction: number): void {
    // if it can stay within one component, let it.
    if (this.focus >= 0 && this.focus < this.fields.length) {
      if (this.fields[this.focus].component.shiftFocus?.(direction)) return this.redraw();
    }

    // bail if nothing accepts focus.
    if (!this.fields.some(f => f.component.acceptsFocus)) return;

    if (this.focus >= 0 && this.focus < this.fields.length) {
      this.fields[this.focus].component.loseFocus?.(direction);
    }

    this.focus += direction;
    while (this.focus >= 0 && this.focus < this.fields.length && !this.fields[this.focus].component.acceptsFocus) {
      this.focus += direction;
    }
    // if we hit the end, bounce back.
    if (this.focus < 0 || this.focus >= this.fields.length) return this.shiftFocus(-direction);

    this.fields[this.focus].component.takeFocus?.(direction);
    this.redraw();
  }

  next() {
    this.shiftFocus(1);
  }

  prev() {
    this.shiftFocus(-1);
  }

  clearBindings() {
    this.customBindings = [];
  }

  bind(key: Key, f: (key: Key, form: Form) => void) {
    const index = this.customBindings.findIndex(([ k, _ ]) => k.equals(key));
    if (index >= 0) this.customBindings.splice(index, 1);
    this.customBindings.push([ key, f ]);
  }

  remove(component: FormComponent) {
    const index = this.fields.findIndex(f => f.component === component);
    if (index < 0) return;

    if (this.focus == index) {
      this.next();
      if (this.focus == index) this.prev();
      // it's possible this was the only focus-able component, in which case... good luck.
    } else if (this.focus > index) {
      this.focus--;
    }
    this.fields.splice(index, 1);
    this.resize();
  }

  insert(index: number, field: FormField) {
    if (index < 0 || index > this.fields.length) return;
    this.fields.splice(index, 0, field);
    if (this.focus >= index) this.focus++;
    this.resize();
  }

  insertBefore(component: FormComponent, field: FormField) {
    const index = this.fields.findIndex(f => f.component === component);
    if (index < 0) return;
    this.insert(index, field);
  }

  insertAfter(component: FormComponent, field: FormField) {
    const index = this.fields.findIndex(f => f.component === component);
    if (index < 0) return;
    this.insert(index + 1, field);
  }
}
