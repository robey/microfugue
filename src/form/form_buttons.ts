import { Key, KeyType, Region } from "antsy";
import { FormComponent } from "../form";
import { lpad, RichText } from "../rich_text";

export interface FormButtonsConfig {
  colorAliases?: Map<string, string>;

  color: string;
  textColor: string;
  focusColor: string;
  focusTextColor: string;

  // how much horizontal and vertical padding should there be around each button?
  horizontalPadding: number;
  verticalPadding: number;
  // how much horizontal spacing between buttons?
  spacing: number;

  // customize everything
  badge: string;
  focusBadge: string;
}

const DEFAULT_TEXT_CONFIG: FormButtonsConfig = {
  color: "555",
  textColor: "fff",
  focusColor: "007",
  focusTextColor: "fff",
  horizontalPadding: 1,
  verticalPadding: 0,
  spacing: 2,
  badge: "□ ",
  focusBadge: "■ ",
};

export interface FormButton {
  text: RichText;
  onClick?(): void;
}


// simplest component: just text
export class FormButtons implements FormComponent {
  acceptsFocus = true;
  config: FormButtonsConfig;
  focus = -1;

  constructor(public buttons: FormButton[], options: Partial<FormButtonsConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_TEXT_CONFIG, options);
  }

  takeFocus(direction: number) {
    this.focus = direction > 0 ? 0 : this.buttons.length - 1;
  }

  loseFocus(_direction: number) {
    this.focus = -1;
  }

  // move focus between buttons
  shiftFocus(direction: number): boolean {
    if (direction < 0) {
      if (this.focus == 0) return false;
      this.focus--;
    } else {
      if (this.focus == this.buttons.length - 1) return false;
      this.focus++;
    }
    return true;
  }

  computeHeight(_width: number): number {
    return this.config.verticalPadding * 2 + 1;
  }

  draw(region: Region) {
    const widths = this.buttons.map((b, i) => {
      return b.text.length + this.config.horizontalPadding * 2 +
        (i == this.focus ? this.config.focusBadge : this.config.badge).length;
    });

    for (let y = 0; y < this.config.verticalPadding; y++) {
      region.at(0, y);
      this.drawVerticalPadding(region, widths);
    }

    region.at(0, this.config.verticalPadding);
    this.buttons.forEach((b, i) => {
      region.backgroundColor(i == this.focus ? this.config.focusColor : this.config.color);
      region.color(i == this.focus ? this.config.focusTextColor : this.config.textColor);
      region.write(lpad("", this.config.horizontalPadding));
      if (i == this.focus) region.moveCursor();
      region.write(i == this.focus ? this.config.focusBadge : this.config.badge);
      b.text.render(region, this.config.colorAliases);
      region.write(lpad("", this.config.horizontalPadding));
      region.move(this.config.spacing, 0);
    });

    for (let y = 0; y < this.config.verticalPadding; y++) {
      region.at(0, y + this.config.verticalPadding + 1);
      this.drawVerticalPadding(region, widths);
    }
  }

  private drawVerticalPadding(region: Region, widths: number[]) {
    widths.forEach((w, i) => {
      region.backgroundColor(i == this.focus ? this.config.focusColor : this.config.color);
      region.write(lpad("", w));
      region.at(region.cursorX + this.config.spacing, region.cursorY);
    });
  }

  feed(key: Key) {
    if (this.focus < 0) return;
    const button = this.buttons[this.focus];
    if (key.modifiers == 0 && (key.type == KeyType.Return || key.key == " ")) {
      // activate!
      if (button.onClick) button.onClick();
    }
  }
}
