"use strict";

const box = require("./box");
const editbox = require("./editbox");
const screen = require("./screen");
const statusbar = require("./statusbar");
const util = require("util");
const _ = require("lodash");

const CSI = "\u001b[";

const DEFAULTS = {
  SidebarVisible: true,
  SidebarWidth: 20,
  EditHeight: 2,

  StatusFgColor: "white",
  StatusBgColor: "blue"
};

class UI {
  /*
   * options:
   * - sidebarVisible: draw the right sidebar?
   * - sidebarWidth: how wide to draw the right sidebar
   * - editHeight: how many lines to devote to editing
   */
  constructor(cols, rows, options = {}) {
    this.screen = new screen.Screen(cols, rows);
    this.sidebarVisible = options.sidebarVisible != null ? options.sidebarVisible : DEFAULTS.SidebarVisible;
    this.sidebarWidth = options.sidebarWidth || DEFAULTS.SidebarWidth;
    this.editHeight = options.editHeight || DEFAULTS.EditHeight;

    const [ r1, r2 ] = this.screen.splitBottom(this.editHeight + 1);
    const [ statusRegion, editRegion ] = r2.splitTop(1);
    const [ mainBox, sidebar ] = r1.splitRight(this.sidebarVisible ? this.sidebarWidth + 1 : 0);
    this.statusRegion = statusRegion;
    this.editRegion = editRegion;
    this.mainBox = mainBox;
    this.sidebar = sidebar;

    this.statusBar = new statusbar.StatusBar(
      this.statusRegion,
      options.statusFgColor || DEFAULTS.StatusFgColor,
      options.statusBgColor || DEFAULTS.StatusBgColor
    );

    this.editBox = new editbox.EditBox(this.editRegion, { maxLength: 40 });
    this.editBox.on("line", console.log);

    // FIXME:
    for (let y = 0; y < sidebar.box.height; y++) {
      sidebar.canvas.color("cyan").at(0, y).write("|");
    }
  }

  reflow() {
    // this.sidebar.changeSiblingSplit(this.sidebarVisible ? this.sidebarWidth + 1 : 0);
    // this.editRegion.changeSiblingSplit(1);
    this.statusBar.redraw();
  }

  paint() {
    return this.screen.paint() + this.editBox.paint({ dropBlanks: true });
  }

  resize(cols, rows) {
    this.screen.resize(cols, rows);
    this.reflow();
    this.editBox.resize();
    return this.paint();
  }

  signal(name) {
    // nothing...
  }

  push(buffer) {
    return this.editBox.handle(buffer);
  }

  setLeftStatus(text) {
    this.statusBar.left = text;
    return this.statusBar.redraw();
  }

  setRightStatus(text) {
    this.statusBar.right = text;
    return this.statusBar.redraw();
  }
}



exports.UI = UI;
