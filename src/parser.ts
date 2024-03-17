import * as vscode from 'vscode';

//###################//
// Public functions //
//###################//

export function parserActivate(context: vscode.ExtensionContext) {
    // variables init
    currEditor = vscode.window.activeTextEditor;

    // Trigger the parser on the active text editor
    if (currEditor) {
        outlinePairUnderCursor(currEditor);
    }

    // On every change in the active text editor
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if(editor) {
            console.log('Editor changed to ', vscode.workspace.asRelativePath(editor.document.fileName));
        }
        else {
            console.log('Editor changed to undefined');
        }

        editorChanged(editor);
        if(currEditor) {
            outlinePairUnderCursor(currEditor);
        }
    }, null, context.subscriptions);

    // On every change in the text document
    vscode.workspace.onDidChangeTextDocument(event => {
        if (currEditor && (event.document === currEditor.document)) {
            outlinePairUnderCursor(currEditor);
        }
    }, null, context.subscriptions);

    // On every change in the text editor selection
    vscode.window.onDidChangeTextEditorSelection(event => {
        if (currEditor && (event.textEditor === currEditor)) {
            outlinePairUnderCursor(currEditor);
        }
    }, null, context.subscriptions);
}

export function parserDeactivate() {
    // Remove the decorations from the current editor
    if (currEditor) {
        currEditor.setDecorations(decorationType, []);
    }
}

/**
 * @brief Highlight the matching preprocessor directives under the cursor (if any)
 * 
 * @param editor The text editor to highlight the pair in
 * @returns 
 */
export async function outlinePairUnderCursor(editor: vscode.TextEditor) {
    // Language should be C or C++
    const languageId = editor.document.languageId;
    if ( !(languageId === 'c' || languageId === 'cpp' || languageId === 'h' || languageId === 'hpp') ) {
        return;
    }

    const position = editor.selection.active;
    const line = editor.document.lineAt(position.line);
    const text = line.text.trim();
    const keywordRanges: vscode.Range[] = [];

    console.log('[outlinePairUnderCursor] File:', vscode.workspace.asRelativePath(editor.document.fileName), 
                '  Ln:', position.line.toString().padStart(4, '0'), 
                '  Col:', position.character.toString().padStart(4, '0'), 
                '  Parsed: "', text, '"');

    // Check if the cursor is on an opening, middle or closing preprocessor directive
    if (text.startsWithOpeningKeyword() || text.startsWithMiddleKeyword() || text.startsWithClosingKeyword()) {
        // Find matching keywords
        const matchingKeywords = findMatchingKeywords(editor.document, position);
        // Add the matching keywords to the list of ranges
        keywordRanges.push(...matchingKeywords);

        // If matching keywords were found, add the current line to the decorations
        if (matchingKeywords.length > 0) {
            // Make an array of all the keywords
            const allKeywords = openingKeywords.concat(middleKeywords).concat(closingKeywords);
            // Find the range of the keyword in line
            allKeywords.forEach(keyword => {
                const k = parseKeywordRange(line, keyword);
                if (k) {
                    keywordRanges.push(k);
                }
            });
        }

        // If no matching keywords were found, no decorations are added
    }
    else {
        console.log('[outlinePairUnderCursor] No preprocessor directive found');
    }

    // Set the decorations to the ranges detected as matching keywords
    editor.setDecorations(decorationType, keywordRanges);
}

//###################//
// Private functions //
//###################//

let currEditor: vscode.TextEditor | undefined;

/**
 * @brief The decoration type to use for the matching preprocessor directives
 */
let decorationType: vscode.TextEditorDecorationType = 
vscode.window.createTextEditorDecorationType({
    border: '1px solid grey',  //Outline
    overviewRulerLane: vscode.OverviewRulerLane.Center,  //Show in the overview ruler
    overviewRulerColor: '#929292',  //Color
});

/**
 * @brief List of opening preprocessor directives
 */
const openingKeywords = [
    '#if',
    '#ifdef',
    '#if defined',
    '#ifndef',
    '#if !defined',
    '#ifeq',
    '#ifneq'
];

/**
 * @brief List of middle preprocessor directives
 */
const middleKeywords = [
    '#elif',
    '#else'
];

/**
 * @brief List of closing preprocessor directives
 */
const closingKeywords = [
    '#endif'
];

/**
 * @brief Enum to represent the direction of the search
 */
const enum Direction {
    Up = -1,
    Down = 1
}

/*
* @brief Find the matching keywords for the given position in the document.
* 
* Parse the document and search for the corresponding keyword for the given position.
* Save depth of the current keyword and search for the next keyword with the same depth.
* 
* @param document The document to search
* @param position The position to search from
* @param direction The direction to search in (0 for up, 1 for down)
* @returns An array of ranges containing the matching keywords
*/
function findMatchingKeywords(document: vscode.TextDocument, position: vscode.Position): vscode.Range[] {
    const line = document.lineAt(position.line);
    const text = line.text.trim();
    const start = line.range.start;
    const end = line.range.end;
    
    let ret: vscode.Range[] = [];

    // If the cursor is on an opening keyword, find the closing keyword
    if (text.startsWithOpeningKeyword()) {
        ret = findClosingKeyword(document, position);
    }

    // If the cursor is on a closing keyword, find the opening keyword
    if (text.startsWithClosingKeyword()) {
        ret = findOpeningKeyword(document, position);
    }

    // If the cursor is on a middle keyword, find both the opening and closing keywords
    if (text.startsWithMiddleKeyword()) {
        let temp1 = findOpeningKeyword(document, position); // Find the opening keyword
        let temp2 = findClosingKeyword(document, position); // Find the closing keyword
        ret = temp1.concat(temp2); // Concatenate the arrays
    }

    return ret;
}

/**
 * @brief Find the opening and middle preprocessor directive for the given position in the document (if any)
 * 
 * @param document The document to search
 * @param position The position to search from
 * @returns An array of ranges containing the opening and middle keywords (if any)
 */
function findOpeningKeyword(document: vscode.TextDocument, position: vscode.Position): vscode.Range[] {
    return searchKeywords(document, position, Direction.Up);
}

/**
 * @brief Find the closing and middle preprocessor directive for the given position in the document (if any)
 * 
 * @param document The document to search
 * @param position The position to search from
 * @returns An array of ranges containing the closing and middle keywords (if any)
 */
function findClosingKeyword(document: vscode.TextDocument, position: vscode.Position): vscode.Range[] {
    return searchKeywords(document, position, Direction.Down);
}

/**
 * @brief Search for the matching preprocessor directive for the given position in the document
 * 
 * Parse the document and search for the corresponding keyword for the given position.
 * Save depth of the current keyword and search for each keyword with the same depth.
 * Stops when a opening or closing keyword (depending on the direction) is found with the same depth.
 * 
 * @param document  The document to search
 * @param position  The position to search from
 * @param direction  The direction to search in (0 for up, 1 for down)
 * @returns 
 */
function searchKeywords(document: vscode.TextDocument, position: vscode.Position, direction: Direction): vscode.Range[] {
    const ret: vscode.Range[] = [];
    let line = position.line + direction; // Start from the next line
    let depth = 0;
    let found = false;

    while ( (line >= 0 && line < document.lineCount) && (!found)) {
        // Parse the line
        const text = document.lineAt(line).text.trim();

        // Opening keyword detected
        if ( text.startsWithOpeningKeyword() ) {
            // If we are going up and the depth is 0, we found the last keyword
            if ( (direction === Direction.Up) && (depth === 0) ) {
                // Find the range of the keyword in line
                openingKeywords.forEach(keyword => {
                    const range = parseKeywordRange(document.lineAt(line), keyword);
                    if (range) {
                        ret.push(range); // Add the range of the keyword
                    }
                });
                found = true; // Stop the search
            }
            // Otherwise, increase the depth
            else {
                depth += 1;
            }
        }

        // Middle keyword detected
        else if (text.startsWithMiddleKeyword()) {
            // If its on the same depth, we found a matching keyword
            if (depth === 0) {
                // Find the range of the keyword in line
                middleKeywords.forEach(keyword => {
                    const range = parseKeywordRange(document.lineAt(line), keyword);
                    if (range) {
                        ret.push(range); // Add the range of the keyword
                    }
                });
            }
        }

        // Closing keyword detected
        else if ( text.startsWithClosingKeyword() ) {
            // If we are going down and the depth is 0, we found the last keyword
            if ( (direction === Direction.Down) && (depth === 0) ) {
                // Find the range of the keyword in line
                closingKeywords.forEach(keyword => {
                    const range = parseKeywordRange(document.lineAt(line), keyword);
                    if (range) {
                        ret.push(range); // Add the range of the keyword
                    }
                });
                found = true; // Stop the search
            }
            // Otherwise, decrease the depth
            else {
                depth -= 1;
            }
        }

        // Move to the next line
        line += direction;
    }

    return ret;
}

/**
 * @brief Parse the given line and search for the given keyword
 * 
 * @param line The line to parse
 * @param keyword The keyword to search for
 * @returns The range of the keyword if found, undefined otherwise
 */
function parseKeywordRange(line: vscode.TextLine, keyword: string): vscode.Range | undefined {
    const index = line.text.indexOf(keyword);
    if (index !== -1) {
        return new vscode.Range(line.lineNumber, index, line.lineNumber, index + keyword.length);
    }
    return undefined;
}

function editorChanged(editor: vscode.TextEditor | undefined) {
    // Remove the decorations from the current editor, if any
    if(currEditor && (currEditor !== editor)) {
        currEditor!.setDecorations(decorationType, []);
    }

    // Set the new editor as the current editor
    currEditor = editor;
}


//###################//
// String extensions //
//###################//

// Extend the String prototype to add startsWithOpeningKeyword
declare global {
    interface String {
        startsWithOpeningKeyword(): boolean;
        startsWithClosingKeyword(): boolean;
        startsWithMiddleKeyword(): boolean;
    }
}

/**
 * @brief Check if the string starts with an opening preprocessor directive
 * 
 * @returns True if the string starts with an opening preprocessor directive, false otherwise
 */
String.prototype.startsWithOpeningKeyword = function() {
    return openingKeywords.some(keyword => this.trim().startsWith(keyword));
};

/**
 * @brief Check if the string starts with a closing preprocessor directive
 * 
 * @returns The keyword if the string starts with a closing preprocessor directive, false otherwise
 */
String.prototype.startsWithClosingKeyword = function() {
    return closingKeywords.some(keyword => this.trim().startsWith(keyword));
};

/**
 * @brief Check if the string starts with a middle preprocessor directive
 * 
 * @returns The keyword if the string starts with a middle preprocessor directive, false otherwise
 */
String.prototype.startsWithMiddleKeyword = function() {
    return middleKeywords.some(keyword => this.trim().startsWith(keyword));
};

