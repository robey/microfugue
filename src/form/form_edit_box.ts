import { GridLayout, Key, Region } from "antsy";
import { EditBox } from "../edit_box";
import { Form, FormComponent } from "../form";

export interface FormEditBoxConfig {
  color: string;
  focusColor: string;
  textColor: string;
  focusTextColor: string;

  maxLength: number;
  minHeight: number;
  maxHeight: number;
}

const DEFAULT_EDIT_BOX_CONFIG: FormEditBoxConfig = {
  color: "333",
  focusColor: "007",
  textColor: "999",
  focusTextColor: "fff",

  maxLength: 255,
  minHeight: 1,
  maxHeight: 5,
};

// simplest component: just text
export class FormEditBox implements FormComponent {
  acceptsFocus = true;
  config: FormEditBoxConfig;
  focused = false;
  form?: Form;
  layout?: GridLayout;
  editBox?: EditBox;
  height: number;

  constructor(public content: string, options: Partial<FormEditBoxConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_EDIT_BOX_CONFIG, options);
    this.height = this.config.minHeight;
  }

  takeFocus(_direction: number) {
    this.focused = true;
    if (this.editBox) {
      this.editBox.reconfigure({
        color: this.config.focusTextColor,
        backgroundColor: this.config.focusColor,
        alwaysFocused: true,
      });
    }
  }

  loseFocus(_direction: number) {
    this.focused = false;
    if (this.editBox) {
      this.editBox.reconfigure({
        color: this.config.textColor,
        backgroundColor: this.config.color,
        alwaysFocused: false,
      });
    }
  }

  computeHeight(_width: number): number {
    return this.height;
  }

  draw(region: Region, form: Form) {
    if (!this.form) this.form = form;
    if (!this.editBox) {
      // constrain the editing part to max len & height
      this.layout = new GridLayout(
        region,
        [ GridLayout.fixed(this.config.maxLength) ],
        [ GridLayout.fixed(this.height) ]
      );

      this.editBox = new EditBox(this.layout.layoutAt(0, 0), {
        color: this.focused ? this.config.focusTextColor : this.config.textColor,
        backgroundColor: this.focused ? this.config.focusColor : this.config.color,
        maxLength: this.config.maxLength,
        allowScroll: true,
        heightChangeRequest: (lines: number) => this.resizeHeight(lines),
        useHistory: false,
        commitOnEnter: false,
        alwaysFocused: this.focused,
      });
      if (this.content) this.editBox.insert(this.content);
    }
    this.editBox?.redraw();
  }

  resizeHeight(lines: number) {
    this.height = Math.min(this.config.maxHeight, Math.max(this.config.minHeight, lines));
    setTimeout(() => {
      if (this.layout) this.layout.adjustRow(0, GridLayout.fixed(this.height));
      if (this.form) this.form.redraw();
    }, 0);
  }

  feed(key: Key) {
    if (this.editBox) this.editBox.feed(key);
  }

  get text(): string {
    return this.editBox?.line ?? this.content;
  }
}
