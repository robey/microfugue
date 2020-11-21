import { Constraint, GridLayout, Key, KeyType, Region } from "antsy";
import { Form, FormComponent } from "../form";
import { lpad, RichText } from "../rich_text";

export interface FormButtonConfig {
  colorAliases?: Map<string, string>;

  color: string;
  textColor: string;
  focusColor: string;
  focusTextColor: string;

  // how much horizontal and vertical padding should there be around each button?
  horizontalPadding: number;
  verticalPadding: number;

  // customize everything
  focusBadgeLeft: string;
  focusBadgeRight: string;
}

const DEFAULT_TEXT_CONFIG: FormButtonConfig = {
  color: "333",
  textColor: "999",
  focusColor: "007",
  focusTextColor: "fff",
  horizontalPadding: 1,
  verticalPadding: 0,
  focusBadgeLeft: "▶",
  focusBadgeRight: "◀",
};


// simplest component: just text
export class FormButton implements FormComponent {
  acceptsFocus = true;
  config: FormButtonConfig;
  constraint: Constraint;
  region?: Region;
  focused = false;
  width: number;

  constructor(public text: RichText, public onClick: () => void, options: Partial<FormButtonConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_TEXT_CONFIG, options);
    this.width = text.length + this.config.horizontalPadding * 2 +
      this.config.focusBadgeLeft.length + this.config.focusBadgeRight.length;
    this.constraint = GridLayout.fixed(this.width);
  }

  takeFocus(_direction: number) {
    this.focused = true;
  }

  loseFocus(_direction: number) {
    this.focused = false;
  }

  computeHeight(_width: number): number {
    return this.config.verticalPadding * 2 + 1;
  }

  attach(region: Region, _form: Form) {
    this.region = region;
  }

  draw() {
    if (!this.region) return;
    for (let y = 0; y < this.config.verticalPadding; y++) {
      this.region.backgroundColor(this.focused ? this.config.focusColor : this.config.color);
      this.region.at(0, y).write(lpad("", this.width));
      this.region.at(0, y + this.config.verticalPadding + 1).write(lpad("", this.width));
    }

    this.region.at(0, this.config.verticalPadding);
    this.region.backgroundColor(this.focused ? this.config.focusColor : this.config.color);
    this.region.color(this.focused ? this.config.focusTextColor : this.config.textColor);
    this.region.write(this.focused ? this.config.focusBadgeLeft : lpad("", this.config.focusBadgeLeft.length));
    this.region.write(lpad("", this.config.horizontalPadding));
    if (this.focused) this.region.moveCursor();
    this.text.render(this.region, this.config.colorAliases);
    this.region.write(lpad("", this.config.horizontalPadding));
    this.region.write(this.focused ? this.config.focusBadgeRight : lpad("", this.config.focusBadgeRight.length));
  }

  feed(key: Key) {
    if (key.modifiers == 0 && (key.type == KeyType.Return || key.key == " ")) {
      this.onClick();
    }
  }
}