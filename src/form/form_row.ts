import { Constraint, GridLayout, Key, Region } from "antsy";
import { Form, FormComponent } from "../form";

export interface FormRowConfig {
  // how much horizontal spacing between components?
  spacing: number;

  // override horizontal space constraint?
  constraint: Constraint;
}

const DEFAULT_ROW_CONFIG: FormRowConfig = {
  spacing: 2,
  constraint: GridLayout.stretch(1),
};

// row of small components
export class FormRow implements FormComponent {
  config: FormRowConfig;
  region?: Region;
  form?: Form;
  focus = -1;
  refocusing = false;

  // layout
  rows: FormComponent[][] = [];
  rowHeights: number[] = [];
  grid?: GridLayout;

  constructor(public components: FormComponent[], options: Partial<FormRowConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_ROW_CONFIG, options);
  }

  get constraint(): Constraint {
    return this.config.constraint;
  }

  get acceptsFocus(): boolean {
    return this.components.some(c => c.acceptsFocus);
  }

  takeFocus(direction: number) {
    if (this.refocusing) return;
    this.focus = direction > 0 ? 0 : this.components.length - 1;
    while (this.focus >= 0 && this.focus < this.components.length && !this.components[this.focus].acceptsFocus) {
      this.focus += direction;
    }
    // there might be nothing that takes focus, so just let the first component have it.
    if (this.focus < 0 || this.focus >= this.components.length) this.focus = 0;
    this.components[this.focus].takeFocus?.(direction);
  }

  loseFocus(direction: number) {
    if (this.refocusing) return;
    if (this.focus >= 0) this.components[this.focus].loseFocus?.(direction);
    this.focus = -1;
  }

  allowBlur(): boolean {
    if (this.focus < 0 || this.focus >= this.components.length) return true;
    return this.components[this.focus].allowBlur?.() ?? true;
  }

  // move focus between buttons
  shiftFocus(direction: number): boolean {
    if (this.focus < 0) return false;
    if (this.components[this.focus].shiftFocus?.(direction)) return true;

    this.components[this.focus].loseFocus?.(direction);
    this.focus += direction;
    while (this.focus >= 0 && this.focus < this.components.length && !this.components[this.focus].acceptsFocus) {
      this.focus += direction;
    }
    if (this.focus >= 0 && this.focus < this.components.length) {
      this.components[this.focus].takeFocus?.(direction);
      return true;
    } else {
      this.focus = -1;
      return false;
    }
  }

  moveFocus(component: FormComponent) {
    // tell the form we're the new focus! (ignore focus callbacks while they do it)
    this.refocusing = true;
    this.form?.moveFocus(this);
    this.refocusing = false;

    const index = this.components.indexOf(component);
    if (index < 0) return;
    if (this.focus >= 0) this.components[this.focus].loseFocus?.(index > this.focus ? 1 : -1);
    this.components[index].takeFocus?.(this.focus < 0 || index > this.focus ? 1 : -1);
    this.focus = index;
    this.form?.redraw();
  }

  attach(region: Region, form: Form) {
    this.region = region;
    this.form = form;
  }

  // given our width, we can now layout our components, wrap them into rows,
  // and attach them to grid regions.
  computeHeight(rowWidth: number): number {
    if (!this.region) return 0;

    // compute number of rows we need
    this.rows = [];
    let row: FormComponent[] = [];
    let width = 0;
    for (const c of this.components) {
      const cw = c.constraint.minimum;
      if (width + cw > rowWidth) {
        this.rows.push(row);
        row = [];
        width = 0;
      }
      width += cw + this.config.spacing;
      row.push(c);
    }
    if (row.length > 0) this.rows.push(row);

    // split our region into one grid per row
    if (this.grid) this.grid.detach();
    this.grid = new GridLayout(this.region, [ GridLayout.stretch(1) ], this.rows.map(_ => GridLayout.stretch(1)));

    const rowHeights = this.rows.map((row, y) => {
      const rowRegion = this.grid!.layoutAt(0, y);

      // each row has its own grid, N elements wide, 1 element high.
      // add the spacing as a separate column.
      const rowConstraints: Constraint[] = [];
      for (const r of row) rowConstraints.push(r.constraint, GridLayout.fixed(this.config.spacing));
      rowConstraints.splice(-1, 1);
      const rowGrid = new GridLayout(rowRegion, rowConstraints, [ GridLayout.stretch(1) ]);

      // layout the regions on this row, and figure out the max height, which is this row's height
      const heights = row.map((c, x) => {
        const region = rowGrid.layoutAt(2 * x, 0);
        c.attach(region, this.form!);
        return c.computeHeight(region.cols);
      });
      const rowHeight = Math.max(...heights);
      rowGrid.adjustRow(0, GridLayout.fixed(rowHeight));
      return rowHeight;
    });

    // our height is the total of each row height
    return rowHeights.reduce((a, b) => a + b, 0);
  }

  draw() {
    for (const c of this.components) c.draw();
  }

  feed(key: Key, form: Form): boolean {
    if (this.focus < 0) return false;
    return this.components[this.focus].feed?.(key, form) ?? false;
  }
}
