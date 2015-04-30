"use strict";

class EditBox {
  constructor(region) {
    this.region = region;
    this.reset();
  }

  reset() {
    this.line = "";
    this.pos = 0;
  }

  paint() {
    this.region.canvas.clear().at(0, 0).write(this.line);
    return this.region.paint() + this.region.moveTo(this.pos, 0);
  }
}


exports.EditBox = EditBox;

//
// class Readline
//   constructor: (@terminal, @input, @color) ->
//     @div = @terminal.div.text
//     @active = false
//     @history = []
//     @historyIndex = 0
//     @pasteBuffer = ""
//     @input.on "keypress", (event) =>
//       return unless @active and event.which >= 0x20 and event.which <= 0x7e
//       @insertChar(event.which)
//       false
//     @input.on "keydown", (event) =>
//       return unless @active
//       if event.ctrlKey
//         # hello emacs users!
//         key = String.fromCharCode(event.which).toLowerCase()
//         switch key
//           when "a" then @home()
//           when "b" then @left()
//           when "c" then @cancel()
//           when "d" then @deleteForward()
//           when "e" then @end()
//           when "f" then @right()
//           when "h" then @backspace()
//           when "k" then @deleteToEol()
//           when "n" then @down()
//           when "p" then @up()
//       else
//         special = SpecialKeys[event.which]
//         switch special
//           when "left" then @left()
//           when "right" then @right()
//           when "up" then @up()
//           when "down" then @down()
//           when "backspace" then @backspace()
//           when "del" then @deleteForward()
//           when "return" then @enter()
//           when "enter" then @enter()
//     @input.on "paste", (e) =>
//       clipboard = e.originalEvent.clipboardData
//       if "text/plain" not in clipboard.types then return
//       @paste clipboard.getData("text/plain")
//
//   start: (color = @color, prompt = "") ->
//     @defer = Q.defer()
//     @terminal.setColor(color)
//     @terminal.print(prompt)
//     @terminal.setColor(@color)
//     @line = ""
//     @pos = 0
//     @historyIndex = @history.length
//     @active = true
//     after 1, =>
//       @input.focus()
//     @terminal.startCursor()
//     if @pasteBuffer.length > 0 then after 10, =>
//       text = @pasteBuffer
//       @pasteBuffer = ""
//       @paste text
//     @defer.promise
//
//   paste: (text) ->
//     autoLf = false
//     i = text.indexOf("\n")
//     if i >= 0
//       @pasteBuffer = text[i + 1 ...]
//       text = text[...i]
//       autoLf = true
//     @insert text
//     if autoLf then @enter()
//
//   insertChar: (ch) ->
//     @insert(String.fromCharCode(ch))
//
//   insert: (text) ->
//     @line = @line[...@pos] + text + @line[@pos...]
//     @pos += text.length
//     @terminal.print(text)
//     [ x, y ] = @terminal.getCursor()
//     oldHeight = @terminal.getSize()[1]
//     @terminal.print(@line[@pos...])
//     @terminal.setCursor(x, y)
//     @terminal.refresh()
//
//   backspace: ->
//     return unless @pos > 0
//     @pos -= 1
//     @line = @line[...@pos] + @line[@pos + 1 ...]
//     @moveLeft()
//     [ x, y ] = @terminal.getCursor()
//     if @pos < @line.length then @terminal.print(@line[@pos...])
//     @terminal.putChar(" ")
//     @terminal.setCursor(x, y)
//     @terminal.refresh()
//     false
//
//   deleteForward: ->
//     return unless @pos < @line.length
//     @moveRight()
//     @pos += 1
//     @backspace()
//
//   left: ->
//     return unless @pos > 0
//     @moveLeft()
//     @pos -= 1
//     false
//
//   right: ->
//     return unless @pos < @line.length
//     @moveRight()
//     @pos += 1
//     false
//
//   up: ->
//     return if @historyIndex == 0
//     @clear()
//     @historyIndex -= 1
//     @insert @history[@historyIndex]
//     false
//
//   down: ->
//     return if @historyIndex == @history.length
//     @clear()
//     @historyIndex += 1
//     if @historyIndex < @history.length then @insert @history[@historyIndex]
//     false
//
//   home: ->
//     while @pos > 0 then @left()
//     false
//
//   end: ->
//     while @pos < @line.length then @right()
//     false
//
//   deleteToEol: ->
//     while @pos < @line.length then @deleteForward()
//
//   clear: ->
//     @deleteToEol()
//     while @pos > 0 then @backspace()
//
//   enter: ->
//     @terminal.linefeed()
//     @terminal.stopCursor()
//     @terminal.refresh()
//     i = @history.indexOf(@line)
//     if i >= 0 then @history.splice(i, 1)
//     @history.push @line
//     if @history.length > 100 then @history = @history[@history.length - 100 ...]
//     @active = false
//     if @defer? then @defer.resolve(@line)
//
//   cancel: ->
//     @terminal.setColor("f00")
//     @terminal.print("^C")
//     @terminal.setColor(@color)
//     @terminal.linefeed()
//     @terminal.refresh()
//     @active = false
//     if @defer? then @defer.resolve(null)
//
//   moveLeft: ->
//     [ x, y ] = @terminal.getCursor()
//     x -= 1
//     if x < 0
//       x = @terminal.getSize()[0] - 1
//       y -= 1
//     @terminal.setCursor(x, y)
//
//   moveRight: ->
//     [ x, y ] = @terminal.getCursor()
//     x += 1
//     if x > @terminal.getSize()[0] - 1
//       y += 1
//       x = 0
//     @terminal.setCursor(x, y)
//
//
// exports.Readline = Readline
