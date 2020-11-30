import { Constraint, GridLayout, Key, Region } from "antsy";
import { EditBox } from "../edit_box";
import { Form, FormComponent } from "../form";
import { COLOR_COMPONENT, COLOR_COMPONENT_ERROR, COLOR_COMPONENT_FOCUS, COLOR_DIM, COLOR_DIM_FOCUS, COLOR_FG, COLOR_FG_FOCUS } from "./form_colors";

export interface FormEditBoxConfig {
  color: string;
  focusColor: string;
  textColor: string;
  focusTextColor: string;
  dimColor: string;
  focusDimColor: string;
  errorColor: string;

  minWidth: number;
  maxLength: number;
  minHeight: number;
  maxHeight: number;

  enterAction: "ignore" | "commit" | "insert";
  wordWrap: boolean;
  visibleLinefeed: boolean;

  allowBlur?: (box: FormEditBox) => boolean;
}

const DEFAULT_EDIT_BOX_CONFIG: FormEditBoxConfig = {
  color: COLOR_COMPONENT,
  focusColor: COLOR_COMPONENT_FOCUS,
  textColor: COLOR_FG,
  focusTextColor: COLOR_FG_FOCUS,
  dimColor: COLOR_DIM,
  focusDimColor: COLOR_DIM_FOCUS,
  errorColor: COLOR_COMPONENT_ERROR,

  minWidth: 10,
  maxLength: 255,
  minHeight: 1,
  maxHeight: 5,

  enterAction: "ignore",
  wordWrap: false,
  visibleLinefeed: false,
};

// simplest component: just text
export class FormEditBox implements FormComponent {
  acceptsFocus = true;
  config: FormEditBoxConfig;
  constraint: Constraint;
  focused = false;
  form?: Form;
  layout?: GridLayout;
  editBox?: EditBox;
  height: number;
  isError = false;

  // hook for when the selection is changed
  onChanged?: () => void;

  constructor(private content: string, options: Partial<FormEditBoxConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_EDIT_BOX_CONFIG, options);
    this.height = this.config.minHeight;
    this.constraint = GridLayout.stretchWithMinMax(1, this.config.minWidth, this.config.maxLength);
  }

  takeFocus(_direction: number) {
    this.focused = true;
    if (this.editBox) {
      this.editBox.reconfigure({
        color: this.config.focusTextColor,
        backgroundColor: this.config.focusColor,
        suggestionColor: this.config.focusDimColor,
        focused: true,
      });
    }
  }

  loseFocus(_direction: number) {
    this.focused = false;
    if (this.editBox) {
      this.editBox.reconfigure({
        color: this.config.textColor,
        backgroundColor: this.config.color,
        suggestionColor: this.config.dimColor,
        focused: false,
      });
      this.onChanged?.();
    }
  }

  computeHeight(_width: number): number {
    return this.height;
  }

  attach(region: Region, form: Form) {
    this.form = form;

    // constrain the editing part to max len & height
    if (this.layout) this.layout.detach();
    this.layout = new GridLayout(
      region,
      [ GridLayout.fixed(this.config.maxLength) ],
      [ GridLayout.fixed(this.height) ]
    );

    if (this.editBox) {
      // just re-attach it to our new region
      this.editBox.attach(this.layout.layoutAt(0, 0));
      return;
    }

    this.editBox = new EditBox(this.layout.layoutAt(0, 0), {
      color: this.focused ? this.config.focusTextColor : this.config.textColor,
      backgroundColor: this.focused ? this.config.focusColor : this.config.color,
      maxLength: this.config.maxLength,
      allowScroll: true,
      heightChangeRequest: (lines: number) => this.resizeHeight(lines),
      useHistory: false,
      enterAction: this.config.enterAction,
      wordWrap: this.config.wordWrap,
      visibleLinefeed: this.config.visibleLinefeed,
      focused: this.focused,
    });
    if (this.content) this.editBox.insert(this.content);
  }

  draw() {
    this.editBox?.redraw();
  }

  resizeHeight(lines: number) {
    this.height = Math.min(this.config.maxHeight, Math.max(this.config.minHeight, lines));
    setTimeout(() => {
      if (this.layout) this.layout.adjustRow(0, GridLayout.fixed(this.height));
      if (this.form) this.form.resize();
    }, 0);
  }

  feed(key: Key) {
    if (this.isError) {
      this.editBox?.reconfigure({ backgroundColor: this.config.color });
      this.isError = false;
    }
    if (this.editBox) this.editBox.feed(key);
  }

  get text(): string {
    return this.editBox?.text ?? this.content;
  }

  // return true to remain focused
  shiftFocus(_direction: number): boolean {
    if (!this.config.allowBlur) return false;
    if (this.config.allowBlur(this)) return false;
    this.isError = true;
    this.editBox?.reconfigure({ backgroundColor: this.config.errorColor });
    return true;
  }
}
