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

## Release Notes

### 0.3.0

**Added** hints after `#endif` directive.

**Added** settings to enable/disable the extension, enable/disable the hints and enable/disable the outlines.

### 0.2.0

**Added** handling of #undef directives.
If any `#undef` directive is found, the corresponding #define directive is outlined (and vice versa).

### 0.1.1

**Fix** outline behavior whith indentated directives and selection.

### 0.1.0
<!-- bold -->
**Initial release** of C/C++ Preprocessors Visualizer.
Main feature is the outline of conditionnal preprocessor directives.
More features are planned for future releases.
