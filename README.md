# C/C++ Preprocessors Visualizer

This extension is a tool for a better visualization of preprocessor directives in C/C++ code.

> Extension is under development.

## Features

- [x] Outline conditionnal (`#if`,`#ifdef`,...) preprocessor directives when cursor is on a line containing one.
- [ ] Outline definition (`#define`) preprocessor directives when cursor is on a line containing one (and when there is a closing directive `#undef`).
- [ ] Highlight `#define` preprocessor directives. (Useful for multiline directives)
- [ ] Display tested conditionnal preprocessor directives next to the closing directive. e.g. :
  <!-- Example Code -->
    ```c
    #ifdef TEST
    ...
    #endif [TEST] <- Visual hint, Greyed out
    ```

- [ ] Add settings to personalize the extension behavior.
- [ ] Add commands to toggle the extension behavior on/off.

## Extension Settings

- `c-cpp-preprocessors-visualizer.enable`: Enable/disable this extension.

## Release Notes

### 0.1.1

**Fix** outline behavior whith indentated directives and selection.

### 0.1.0
<!-- bold -->
**Initial release** of C/C++ Preprocessors Visualizer.
Main feature is the outline of conditionnal preprocessor directives.
More features are planned for future releases.
