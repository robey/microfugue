# microfugue

a small library for creating UX elements in ansi-compatible terminals, using [antsy](https://github.com/robey/antsy).

- `EditBox`: a line editor like "readline", which accepts key events and provides an `AsyncIterator` of lines. it supports most basic unix line-editing control codes, and has a navigable history.

- `LogView`: renders an antsy `Canvas` full of lines of `RichText`. lines are appended at the bottom. can be limited to storing a limited number of historical lines. lines are optionally word-wrapped.

- `RichText`: text model consisting of (possibly nested) spans of text with a color attribute. can parse a simple format like `"this is {f00:red}"` or you can generate the spans yourself.

- `ScrollView`: fills an antsy `Region` with the contents of a `Canvas` (like `LogView`) that can be scrolled vertically.

- `StatusBar`: displays a one-line status bar, where the left and right half can be updated independently.
