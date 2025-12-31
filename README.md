# C/C++ Preprocessors Visualizer

This extension is a tool for a better visualization of preprocessor directives in C/C++ code.

![c-cpp-preprocessor-visualizer-demo](https://github.com/user-attachments/assets/a9ac7198-b382-41af-be86-70092c85e3be)

> Extension is under development.

## Features

- [x] Outline conditionnal (`#if`,`#ifdef`,...) preprocessor directives when cursor is on a line containing one.
- [x] Outline definition (`#define`, `#undef`) preprocessor directives when cursor is on a line containing one.
- [x] Display tested conditionnal preprocessor directives next to the closing directive.
- [x] Add commands to toggle the extension behavior on/off.
- [x] Add settings to personalize the extension behavior.

- [ ] Highlight `#define` preprocessor directives. (Useful for multilines macro)

## Extension Settings

- `c-cpp-preprocessors-visualizer.enable`: Enable/disable this extension.
- `c-cpp-preprocessors-visualizer.outlines.enable`: Enable/disable outlines display.
- `c-cpp-preprocessors-visualizer.hints.enable`: Enable/disable hints display after directives.
- `c-cpp-preprocessors-visualizer.hints.activeEditorOnly`: Display hints only in the editor your cursor is in.

## Release Notes

### 0.5.0

- **Bundle** extension for faster loading time.
- **Add** extension icon.
