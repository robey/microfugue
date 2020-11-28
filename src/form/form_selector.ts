import { Constraint, GridLayout, Key, KeyType, Region } from "antsy";
import { Form, FormComponent } from "../form";
import { lpad, RichText } from "../rich_text";
import { COLOR_COMPONENT, COLOR_COMPONENT_FOCUS, COLOR_DIM_FOCUS, COLOR_FG, COLOR_FG_FOCUS } from "./form_colors";

export interface FormSelectorConfig {
  // can multiple be selected?
  multiSelect: boolean;

  colorAliases?: Map<string, string>;

  color: string;
  textColor: string;
  focusColor: string;
  focusTextColor: string;
  focusBadgeColor: string;

  // how much horizontal padding should there be around the selector?
  horizontalPadding: number;

  // customize everything
  focusBadgeLeft: string;
  focusBadgeRight: string;
  selectedBadge: string;
  unselectedBadge: string;
  moreAboveBadge: string;
  moreBelowBadge: string;
}

const DEFAULT_TEXT_CONFIG: FormSelectorConfig = {
  multiSelect: false,
  color: COLOR_COMPONENT,
  textColor: COLOR_FG,
  focusColor: COLOR_COMPONENT_FOCUS,
  focusTextColor: COLOR_FG_FOCUS,
  focusBadgeColor: COLOR_DIM_FOCUS,
  horizontalPadding: 1,
  focusBadgeLeft: "▶",
  focusBadgeRight: "◀",
  selectedBadge: "✓",
  unselectedBadge: " ",
  moreAboveBadge: "…",
  moreBelowBadge: "…",
};


// select one or more items from a list
export class FormSelector implements FormComponent {
  acceptsFocus = true;
  config: FormSelectorConfig;
  region?: Region;
  form?: Form;
  constraint!: Constraint;
  selected = new Set<number>();
  focused = false;
  active = false;
  display = 0;
  width = 0;

  // for rendering the list when active:
  yOffset?: number;

  // hook for when the selection is changed
  onChanged?: () => void;

  constructor(public choices: RichText[], selected: number[], options: Partial<FormSelectorConfig> = {}) {
    this.config = Object.assign({}, DEFAULT_TEXT_CONFIG, options);
    this.setChoices(choices, selected);
    if (selected.length > 0) this.display = selected[0];
  }

  setChoices(choices: RichText[], selected: number[] = []) {
    this.choices = choices;
    this.selected = new Set(selected);
    this.width = Math.max(...choices.map(s => s.length)) + 2 * this.config.horizontalPadding +
      this.config.selectedBadge.length +
      this.config.focusBadgeLeft.length +
      this.config.focusBadgeRight.length;
    this.constraint = GridLayout.fixed(this.width);
    this.draw();
  }

  setDisplay(n: number) {
    this.display = n;
    this.draw();
  }

  takeFocus(_direction: number) {
    this.focused = true;
  }

  loseFocus(_direction: number) {
    this.focused = false;
    this.active = false;
  }

  computeHeight(_width: number): number {
    return 1;
  }

  attach(region: Region, form: Form) {
    this.region = region;
    this.form = form;
  }

  draw() {
    if (!this.region || !this.form) return;

    if (this.active) {
      // use the whole form's region as our playground, mwuhaha!
      const region = this.form.canvas.all();
      const [ rx, ry ] = this.region.offsetFrom(region);
      // compute a starting y if we haven't already
      if (this.yOffset === undefined) this.yOffset = ry - this.display;
      // did we move too close to the top, and need to scroll?
      if (this.yOffset + this.display <= 0) this.yOffset = 1 - this.display;
      // did we move too close to the bottom, and need to scroll?
      if (this.yOffset + this.display >= region.rows - 1) this.yOffset = region.rows - 2 - this.display;

      for (let i = 0, y = this.yOffset; i < this.choices.length && y < region.rows; i++, y++) {
        if (y >= 0) this.renderChoice(region, i, true, i == this.display, rx, y);
      }
    } else {
      this.renderChoice(this.region, this.display, false, this.focused);
    }
  }

  private renderChoice(region: Region, index: number, active: boolean, focused: boolean, x: number = 0, y: number = 0) {
    const fg = focused ? this.config.focusTextColor : (active? this.config.focusBadgeColor : this.config.textColor);
    const bg = focused || active ? this.config.focusColor : this.config.color;
    region.at(x, y).color(fg, bg).write(lpad("", this.width));
    region.at(x + this.config.focusBadgeLeft.length, y);
    if (focused) region.moveCursor();
    region.write(
      this.selected.has(index) && ((y > 0 && y < region.rows - 1) || !active) ?
      this.config.selectedBadge :
      this.config.unselectedBadge
    );
    region.move(this.config.horizontalPadding, 0);

    if (active && y == 0) {
      region.write(this.config.moreAboveBadge);
    } else if (active && y == region.rows - 1) {
      region.write(this.config.moreBelowBadge);
    } else {
      this.choices[index].render(region, this.config.colorAliases, fg);
    }

    if (focused) {
      region.color(this.config.focusBadgeColor);
      region.at(x, y).write(this.config.focusBadgeLeft);
      region.at(x + this.width - this.config.focusBadgeRight.length, y).write(this.config.focusBadgeRight);
    }
  }

  private select(index: number) {
    if (this.config.multiSelect) {
      if (this.selected.has(index)) {
        this.selected.delete(index);
      } else {
        this.selected.add(index);
      }
    } else {
      this.selected.clear();
      this.selected.add(index);
    }
    if (this.onChanged) this.onChanged();
  }

  feed(key: Key) {
    if (this.active) {
      if (key.modifiers == 0) {
        if (key.type == KeyType.Up) {
          if (this.display > 0) this.display--;
          this.form?.redraw();
        } else if (key.type == KeyType.Down) {
          if (this.display < this.choices.length - 1) this.display++;
          this.form?.redraw();
        } else if (key.key == " ") {
          this.select(this.display);
          this.form?.redraw();
        } else if (key.type == KeyType.Return) {
          if (!this.config.multiSelect) this.select(this.display);
          this.active = false;
          this.form?.redraw();
        } else if (key.type == KeyType.Esc) {
          this.active = false;
          this.form?.redraw();
        }
      }
    } else {
      if (key.modifiers == 0 && (key.type == KeyType.Return || key.key == " ")) {
        this.active = true;
        this.yOffset = undefined;
        this.form?.redraw();
      }
    }
  }
}
