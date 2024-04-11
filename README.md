# C/C++ Preprocessors Visualizer

This extension is a tool for a better visualization of preprocessor directives in C/C++ code.

> Extension is under development.

## Features

- [x] Outline conditionnal (`#if`,`#ifdef`,...) preprocessor directives when cursor is on a line containing one.
- [x] Outline definition (`#define`) preprocessor directives when cursor is on a line containing one (and when there is a closing directive `#undef`).
- [x] Display tested conditionnal preprocessor directives next to the closing directive.
- [x] Add commands to toggle the extension behavior on/off.

- [ ] Highlight `#define` preprocessor directives. (Useful for multiline directives)
- [ ] Add settings to personalize the extension behavior.

## Extension Settings

- `c-cpp-preprocessors-visualizer.enable`: Enable/disable this extension.
- `c-cpp-preprocessors-visualizer.outlines.enable`: Enable/disable hints after `#endif` directives.
- `c-cpp-preprocessors-visualizer.hints.enable`: Enable/disable outlines of preprocessor directives.
- `c-cpp-preprocessors-visualizer.hints.activeEditorOnly`: Display hints only in the editor your cursor is in.

## Release Notes

### 0.3.2

- **Added** 'hints.activeEditorOnly' setting to only show hints for the active editor.
- **Added** parseVisibleEditors function to parse all visible editors.
- **Fix** behaviour when settings changes.
- **Fix** multi editors bugs (duplicated hints or not showed).

### 0.3.1

- **Fix** settings read on extension activation.

### 0.3.0

- **Added** hints after `#endif` directive.
- **Added** settings to enable/disable the extension, enable/disable the hints and enable/disable the outlines.

### 0.2.0

- **Added** handling of #undef directives.
If any `#undef` directive is found, the corresponding `#define` directive is outlined (and vice versa).

### 0.1.1

- **Fix** outline behavior whith indentated directives and selection.

### 0.1.0

- **Initial release** of C/C++ Preprocessors Visualizer. Main feature is the outline of conditionnal preprocessor directives.
