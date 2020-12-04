import { Constraint, GridLayout, Key, KeyType, Region } from "antsy";
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

  // sometimes it can be easier to specify a static width
  oneLineWidth?: number;

  enterAction: "ignore" | "commit" | "insert";
  wordWrap: boolean;
  visibleLinefeed: boolean;

  // return false to reject the current text and make the user change it
  allowBlur?: (box: FormEditBox, form: Form) => boolean;

  // check for auto-complete suggestions (and display one) on every keystroke?
  autoComplete?: (text: string) => (string[] | undefined);
  alwaysSuggest: boolean;

  // called when we lose focus (if `allowBlur` returned true)
  onBlur?: (box: FormEditBox, form: Form) => void;

  // called when the content changes at all
  onChange?: (box: FormEditBox, form: Form) => void;
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
  alwaysSuggest: false,
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

  constructor(private content: string, options: Partial<FormEditBoxConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_EDIT_BOX_CONFIG, options);
    if (options.oneLineWidth !== undefined) {
      this.config.minHeight = 1;
      this.config.maxHeight = 1;
      this.config.minWidth = options.oneLineWidth;
      this.config.maxLength = options.oneLineWidth;
    }
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
    if (!this.form) return;
    this.focused = false;
    if (this.editBox) {
      this.editBox.reconfigure({
        color: this.config.textColor,
        backgroundColor: this.config.color,
        suggestionColor: this.config.dimColor,
        focused: false,
      });
      this.editBox.clearSuggestions();
      this.config.onChange?.(this, this.form);
      this.config.onBlur?.(this, this.form);
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
    if (this.config.autoComplete) this.editBox.autoComplete = this.config.autoComplete;
    if (this.content) this.editBox.insert(this.content);
  }

  draw() {
    this.editBox?.redraw();
  }

  resizeHeight(lines: number) {
    const newHeight = Math.min(this.config.maxHeight, Math.max(this.config.minHeight, lines));
    if (newHeight == this.height) return;

    this.height = newHeight;
    setTimeout(() => {
      if (this.layout) this.layout.adjustRow(0, GridLayout.fixed(this.height));
      if (this.form) this.form.resize();
    }, 0);
  }

  feed(key: Key) {
    if (!this.form) return;
    if (this.isError) {
      this.editBox?.reconfigure({ backgroundColor: this.config.color });
      this.isError = false;
    }
    this.editBox?.feed(key);
    if (this.config.alwaysSuggest) this.editBox?.checkForSuggestions();
    this.config.onChange?.(this, this.form);
  }

  get text(): string {
    return this.editBox?.text ?? this.content;
  }

  setText(text: string) {
    this.editBox?.setText(text);
  }

  // return true to remain focused
  shiftFocus(_direction: number): boolean {
    if (!this.form) return false;
    if (!this.config.allowBlur) return false;
    if (this.config.allowBlur(this, this.form)) return false;
    if (this.editBox?.suggestionIndex !== undefined) {
      // accept the current suggestion
      this.editBox.feed(new Key(0, KeyType.Right));
      if (this.config.allowBlur(this, this.form)) return false;
    }

    this.isError = true;
    this.editBox?.reconfigure({ backgroundColor: this.config.errorColor });
    return true;
  }
}
