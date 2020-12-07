import { Constraint, GridLayout, Region } from "antsy";
import { Form, FormComponent } from "../form";
import { RichText } from "../rich_text";
import { COLOR_BG, COLOR_FG } from "./form_colors";

export interface FormTextConfig {
  colorAliases?: Map<string, string>;
  defaultColor: string;
  acceptsFocus: boolean;
  wordWrap: boolean;
  constraint: Constraint;
}

const DEFAULT_TEXT_CONFIG: FormTextConfig = {
  defaultColor: COLOR_FG,
  acceptsFocus: false,
  wordWrap: true,
  constraint: GridLayout.stretchWithMinimum(1, 10),
};

// simplest component: just text
export class FormText implements FormComponent {
  config: FormTextConfig;
  region?: Region;
  form?: Form;
  focused = false;

  constructor(private text: RichText, options: Partial<FormTextConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_TEXT_CONFIG, options);
  }

  get acceptsFocus(): boolean {
    return this.config.acceptsFocus;
  }

  enable() {
    this.config.acceptsFocus = true;
  }

  disable() {
    this.config.acceptsFocus = false;
  }

  takeFocus(_direction: number) {
    this.focused = true;
  }

  loseFocus(_direction: number) {
    this.focused = false;
  }

  get constraint(): Constraint {
    return this.config.constraint;
  }

  computeHeight(width: number): number {
    return this.text.wrap(width - 1, this.config.wordWrap).length;
  }

  attach(region: Region, form: Form) {
    this.region = region;
    this.form = form;
  }

  draw() {
    if (!this.region) return;
    this.region.backgroundColor(this.form?.config.labelBackground ?? COLOR_BG);
    this.text.wrap(this.region.cols - 1, this.config.wordWrap).forEach((line, i) => {
      if (!this.region) return;
      this.region.at(0, i).clearToEndOfLine();
      line.render(this.region, this.config.colorAliases, this.config.defaultColor);
    });
    // why would you focus a text line?
    if (this.focused) this.region.moveCursor(0, 0);
  }

  setText(t: RichText) {
    this.text = t;
    this.form?.resize();
  }
}
