import { Region } from "antsy";
import { FormComponent } from "../form";
import { RichText } from "../rich_text";

export interface FormTextConfig {
  colorAliases?: Map<string, string>;
  acceptsFocus: boolean;
  wordWrap: boolean;
}

const DEFAULT_TEXT_CONFIG: FormTextConfig = {
  acceptsFocus: false,
  wordWrap: true,
};

// simplest component: just text
export class FormText implements FormComponent {
  config: FormTextConfig;
  region?: Region;
  focused = false;

  constructor(public text: RichText, options: Partial<FormTextConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_TEXT_CONFIG, options);
  }

  get acceptsFocus(): boolean {
    return this.config.acceptsFocus;
  }

  takeFocus(_direction: number) {
    this.focused = true;
  }

  loseFocus(_direction: number) {
    this.focused = false;
  }

  computeHeight(width: number): number {
    return this.text.wrap(width - 1, this.config.wordWrap).length;
  }

  attach(region: Region, _form: Form) {
    this.region = region;
  }

  draw() {
    if (!this.region) return;
    this.text.wrap(this.region.cols - 1, this.config.wordWrap).forEach((line, i) => {
      if (!this.region) return;
      this.region.at(0, i).clearToEndOfLine();
      line.render(this.region, this.config.colorAliases);
    });
    // why would you focus a text line?
    if (this.focused) this.region.moveCursor(0, 0);
  }
}
