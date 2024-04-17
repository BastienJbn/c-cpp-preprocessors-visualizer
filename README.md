# C/C++ Preprocessors Visualizer

This extension is a tool for a better visualization of preprocessor directives in C/C++ code.

> Extension is under development.

## Features

- [x] Outline conditionnal (`#if`,`#ifdef`,...) preprocessor directives when cursor is on a line containing one.
- [x] Outline definition (`#define`, `#undef`) preprocessor directives when cursor is on a line containing one.
- [x] Display tested conditionnal preprocessor directives next to the closing directive.
- [x] Add commands to toggle the extension behavior on/off.

- [ ] Highlight `#define` preprocessor directives. (Useful for multilines macro)
- [ ] Add settings to personalize the extension behavior.

## Extension Settings

- `c-cpp-preprocessors-visualizer.enable`: Enable/disable this extension.
- `c-cpp-preprocessors-visualizer.outlines.enable`: Enable/disable outlines display.
- `c-cpp-preprocessors-visualizer.hints.enable`: Enable/disable hints display after directives.
- `c-cpp-preprocessors-visualizer.hints.activeEditorOnly`: Display hints only in the editor your cursor is in.

## Release Notes

### 0.3.3

- **Fix** hints update when editing file
- **Refactor** code to improve performance and readability. Parsing file once and save data. Use of class instead of functions.
