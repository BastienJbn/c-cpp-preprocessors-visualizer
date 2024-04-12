import * as vscode from 'vscode';

import * as dico from './dico';
import { extensionId } from './misc';
import { Hint } from './Hint';

/**
 * @brief Enum to represent the direction of the search
 */
const enum Direction {
    Up = -1,
    Down = 1
}

export class Parser {
    constructor() {
        // Initialize attributes
        this.currEditor = vscode.window.activeTextEditor;
        this.visibleEditors = [...vscode.window.visibleTextEditors];
        this.hintsMap = new Map();
    }
    
    //##############//
    // Public Scope //
    //##############//

    /**
     * @brief Activate the parser. Parse opened files and set all callbacks.
     * @param context The extension context
     */
    public activate(context: vscode.ExtensionContext) {
        // variables init
        this.currEditor = vscode.window.activeTextEditor;
        this.visibleEditors = [...vscode.window.visibleTextEditors];
    
        // Trigger the parser on extension activation
        if (this.currEditor) {
            this.outlinePairUnderCursor(this.currEditor);
            this.parseVisibleEditors();
        }
    
        // On every change of the active text editor
        vscode.window.onDidChangeActiveTextEditor(editor => {
            this.activeEditorChanged(editor);
        }, null, context.subscriptions);
        
        // On every change of the visible text editors
        vscode.window.onDidChangeVisibleTextEditors(editors => {
            this.visibleEditorsChanged(editors);
        }, null, context.subscriptions);
    
        // On every change in the text document
        vscode.workspace.onDidChangeTextDocument(event => {
            if (this.currEditor && (event.document === this.currEditor.document)) {
                this.outlinePairUnderCursor(this.currEditor);
                this.updateHints(this.currEditor);
            }
        }, null, context.subscriptions);
    
        // On every change in the text editor selection
        vscode.window.onDidChangeTextEditorSelection(event => {
            if (this.currEditor && (event.textEditor === this.currEditor)) {
                this.outlinePairUnderCursor(this.currEditor);
            }
        }, null, context.subscriptions);
    
        // On every change in the configuration (settings)
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(extensionId)) {
                this.removeHints(this.visibleEditors); // Remove all hints
                this.parseVisibleEditors();
            }
        }, null, context.subscriptions);
    }
    
    /**
     * @brief Deactivate the parser. Remove all hints and outlines.
     */
    public deactivate() {
        this.removeHints(this.visibleEditors);  // Remove all hints
        this.removeOutlines();             // Remove all outlines
    }

    //#################//
    // Private Scope   //
    //#################//

    /*** Attributes ***/

    /**
     * @var currEditor
     * @brief The current text editor
     * @details This attribute is used to keep track of the current text editor.
     * @type {vscode.TextEditor | undefined}
     */
    private currEditor: vscode.TextEditor | undefined;
    
    /**
     * @var visibleEditors
     * @brief The list of visible text editors
     * @details This list is used to keep track of the visible text editors.
     * @type {vscode.TextEditor[]}
     */
    private visibleEditors: vscode.TextEditor[];

    /**
     * @var outlineDecoType
     * @brief The decoration type for the outlines
     * @details This attribute is used to keep track of the decoration type for the outlines.
     * @type {vscode.TextEditorDecorationType}
     * @readonly
     */
    private readonly outlineDecoType: vscode.TextEditorDecorationType = 
    vscode.window.createTextEditorDecorationType({
        border: '1px solid grey',  //Outline
        overviewRulerLane: vscode.OverviewRulerLane.Center,  //Show in the overview ruler
        overviewRulerColor: '#929292',  //Color
    });

    /**
     * @var hintsMap
     * @brief A map where each key is a vscode.TextEditor and each value is an array of Hint objects.
     * @details This map is used to keep track of the hints for each visible text editor.
     * @type {Map<vscode.TextEditor, Hint[]>}
     */
    private hintsMap: Map<vscode.TextEditor, Hint[]>;

    /*** Methods ***/

    /**
     * @brief Parse the whole file
     * @param editor The text editor to parse
     */
    async parseFile(editor: vscode.TextEditor) {
        this.updateHints(editor);
    }

    /**
     * @brief Parse the visible editors
     */
    async parseVisibleEditors() {
        // If 'activeEditorOnly' is set to true, only parse the current editor
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (cfg.get('hints.activeEditorOnly')) {
            if (this.currEditor) {
                this.parseFile(this.currEditor);
            }
        }
        // Otherwise, parse all visible editors
        else {
            this.visibleEditors.forEach(e => {
                this.parseFile(e);
            });
        }
    }

    /**
     * @brief Highlight the matching preprocessor directives under the cursor (if any)
     * 
     * @param editor The text editor to highlight the pair in
     * @returns 
     */
    outlinePairUnderCursor(editor: vscode.TextEditor) {
        // If the extension or the feature are disabled, do nothing
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (!cfg.get('enable') || !cfg.get('outlines.enable')) {
            return;
        }

        // Language should be C or C++
        const languageId = editor.document.languageId;
        if ( !(languageId === 'c' || languageId === 'cpp' || languageId === 'h' || languageId === 'hpp') ) {
            return;
        }

        // Should not outline when there is a selection
        const selection = editor.selection;
        if (!selection.start.isEqual(selection.end)) {
            editor.setDecorations(this.outlineDecoType, []); // Remove the outlines
            return;
        }

        const position = editor.selection.active;
        const line = editor.document.lineAt(position.line);
        const text = line.text.trim();
        const keywordRanges: vscode.Range[] = [];

        console.log('[outlinePairUnderCursor] File:', vscode.workspace.asRelativePath(editor.document.fileName), 
                    '  Ln:', position.line.toString().padStart(4, ' '), 
                    '  Col:', position.character.toString().padStart(4, ' '), 
                    '  Parsed: "', text, '"');

        // Check if the cursor is on a directive
        if (text.startsWith('#')) {
            // Find matching keywords
            const matchingKeywords = findMatchingKeywords(editor.document, position);
            // Add the matching keywords to the list of ranges
            keywordRanges.push(...matchingKeywords);

            // If matching keywords were found, add the current line to the decorations
            if (matchingKeywords.length > 0) {
                // Find the range of the keyword in line
                dico.allKeywords.forEach(keyword => {
                    const k = getKeywordRange(line, keyword);
                    if (k) {
                        keywordRanges.push(k);
                    }
                });
            }
        }
        else {
            console.log('[outlinePairUnderCursor] No preprocessor directive found');
        }

        // Set the decorations to the ranges detected as matching keywords
        editor.setDecorations(this.outlineDecoType, keywordRanges);
    }

    /**
     * @brief Remove all the outline decorations from the current editor
     */
    removeOutlines() {
        if (this.currEditor) {
            this.currEditor.setDecorations(this.outlineDecoType, []);
        }
    }

    /**
     * @brief Update the hint under the cursor (add, delete or modify)
     * @param editor  The text editor to update
     */
    updateHints(editor: vscode.TextEditor) {
        let hints = parseHints(editor);
        this.removeHints(editor);
        this.displayHints(editor, hints);
    }

    /**
     * @brief Display the hints in the given text editor
     * 
     * @param editor  The text editor to display the hints in
     */
    displayHints(editor: vscode.TextEditor, hints: Hint[]) {
        // Ensure we always work with an array
        const hintList = Array.isArray(hints) ? hints : [hints];

        // Display the hints in the given editor
        hintList.forEach(h => {
            editor.setDecorations(h.DecoType, [h.Range]);
            this.hintsMap.get(editor)?.push(h);
        });
    }

    /**
     * @brief Remove all the hint decorations from the given editor
     */
    removeHints(editor: vscode.TextEditor | vscode.TextEditor[]) {
        // Ensure we always work with an array
        const editors = Array.isArray(editor) ? editor : [editor];

        // Remove the hints from the given editors
        editors.forEach(e => {
            this.hintsMap.get(e)?.forEach(h => {
                e.setDecorations(h.DecoType, []);
                h.DecoType.dispose();
            });
            this.hintsMap.set(e, []);
        });
    }

    /**
     * @brief Editor changed event handler
     * @param newEditor The new text editor
     */
    activeEditorChanged(newEditor: vscode.TextEditor | undefined) {
        if(!newEditor) {
            console.log('Editor changed to undefined');
        }
        else {
            console.log('Editor changed to', vscode.workspace.asRelativePath(newEditor.document.fileName));

            this.outlinePairUnderCursor(newEditor);
        }

        this.removeOutlines();

        // Remove the hints if the setting is set to activeEditorOnly and parse the new file
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (cfg.get('hints.activeEditorOnly')) {
            if(this.currEditor) {
                this.removeHints(this.currEditor);
            }
            if(newEditor) {
                this.parseFile(newEditor);
            }
        }

        // Set the new editor as the current editor
        this.currEditor = newEditor;
    }

    /**
     * @brief Visible editors changed event handler
     * @param newEditors The new list of visible text editors
     */
    visibleEditorsChanged(newEditors: readonly vscode.TextEditor[]) {
        console.log('Visible editors changed');

        // Compare differences between the old and new visible editors
        const oldEditors = this.visibleEditors;
        const addedEditors = newEditors.filter(e => !oldEditors.includes(e));
        const removedEditors = oldEditors.filter(e => !newEditors.includes(e));

        // Process removed editors
        if (removedEditors.length > 0) {
            this.visibleEditors = this.visibleEditors.filter(e => !removedEditors.includes(e));  // Remove the missing editors from list
        }

        // Process added editors
        addedEditors.forEach(e => {
            this.visibleEditors.push(e);  // Add the new editors to the list
            this.parseFile(e);  // Parse the whole file
        });
    }
}

/**
 * @brief Parse the document and search for the hints to display
 * 
 * @param editor  The text editor to display the hints in
 * @returns  Array of Hint tuples
 */
function parseHints(editor: vscode.TextEditor): Hint[] {
    // Create the return value
    let ret: Hint[] = [];

    // If the extension or the feature are disabled, do nothing
    const cfg = vscode.workspace.getConfiguration(extensionId);
    if (!cfg.get('enable') || !cfg.get('hints.enable')) {
        return ret;
    }

    // Language should be C or C++
    const languageId = editor.document.languageId;
    if ( !(languageId === 'c' || languageId === 'cpp' || languageId === 'h' || languageId === 'hpp') ) {
        return ret;
    }

    const document = editor.document;

    console.log('[displayHints] File:', vscode.workspace.asRelativePath(document.fileName));

    // Parse the document and search for the closing preprocessor directives
    for (let line = 0; line < document.lineCount; line++) {
        const text = document.lineAt(line).text.trim();
        if (text.startsWithClosingKeyword()) {
            // Save closing range
            var closingRange = getKeywordRange(document.lineAt(line), text);
            if(!closingRange) {
                continue; // If the range is undefined, continue (should not happen)
            }

            // Find the opening keyword
            var openingRange = findOpeningKeyword(document, new vscode.Position(line, 0)).pop();
            if (openingRange) {
                // Get the text after the openingRange
                const condition = document.getText(new vscode.Range(openingRange.end, document.lineAt(line).range.end));
                // Build the hint decoration
                const hintDeco = vscode.window.createTextEditorDecorationType({
                    after: {
                        contentText: ` ${condition}`,
                        color: 'grey',
                        fontStyle: 'italic',
                    },
                });
                ret.push(new Hint(hintDeco, closingRange));
            }
        }
    }

    return ret;
}

/**
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

    // If the cursor is on '#define' keyword, find the matching '#undef' keyword
    if (text.startsWith('#define')) {
        const words = text.split(' ');
        if(words.length > 1) {
            const definition = words[1]; // Get the definition
            ret = searchDefinitionKeywords(document, position, Direction.Down, definition);
        }
        // else bad line, do nothing
    }

    // If the cursor is on '#undef' keyword, find the matching '#define' keyword
    if (text.startsWith('#undef')) {
        const words = text.split(' ');
        if(words.length > 1) {
            const definition = words[1]; // Get the definition
            ret = searchDefinitionKeywords(document, position, Direction.Up, definition);
        }
        // else bad line, do nothing
    }

    // Sort the ranges by line number
    ret.sort((a, b) => a.start.line - b.start.line);

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
    return searchConditionalKeywords(document, position, Direction.Up);
}

/**
 * @brief Find the closing and middle preprocessor directive for the given position in the document (if any)
 * 
 * @param document The document to search
 * @param position The position to search from
 * @returns An array of ranges containing the closing and middle keywords (if any)
 */
function findClosingKeyword(document: vscode.TextDocument, position: vscode.Position): vscode.Range[] {
    return searchConditionalKeywords(document, position, Direction.Down);
}

/**
 * @brief Search for the matching conditionnal preprocessor directive for the given position in the document
 * 
 * Parse the document and search for the corresponding keyword for the given position.
 * Save depth of the current keyword and search for each keyword with the same depth.
 * Stops when a opening or closing keyword (depending on the direction) is found with the same depth.
 * Only conditional keywords are searched (#if, #ifdef, #ifndef, #elif, #else, #endif)
 * 
 * @param document  The document to search
 * @param position  The position to search from
 * @param direction  The direction to search in (0 for up, 1 for down)
 * @returns  An array of ranges containing the conditional keywords (if any)
 */
function searchConditionalKeywords(document: vscode.TextDocument, position: vscode.Position, direction: Direction): vscode.Range[] {
    const ret: vscode.Range[] = [];
    let lineNb = position.line + direction; // Start from the next line
    let depth = 0;
    let found = false;

    while ( (lineNb >= 0 && lineNb < document.lineCount) && (!found)) {
        // Parse the line
        const text = document.lineAt(lineNb).text.trim();

        // Opening keyword detected
        if ( text.startsWithOpeningKeyword() ) {
            // If we are going up and the depth is 0, we found the last keyword
            if ( (direction === Direction.Up) && (depth === 0) ) {
                // Find the range of the keyword in line
                dico.openingKeywords.forEach(keyword => {
                    const range = getKeywordRange(document.lineAt(lineNb), keyword);
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
                dico.middleKeywords.forEach(keyword => {
                    const range = getKeywordRange(document.lineAt(lineNb), keyword);
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
                dico.closingKeywords.forEach(keyword => {
                    const range = getKeywordRange(document.lineAt(lineNb), keyword);
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
        lineNb += direction;
    }

    return ret;
}

/**
 * @brief Search for the matching definition preprocessor directive for the given position in the document
 * 
 * Parse the document and search for the corresponding keyword for the given position.
 * Only definition keywords are searched (#define or #undef)
 * 
 * @param document  The document to search
 * @param position  The position to search from
 * @param direction  The direction to search in (0 for up, 1 for down)
 * @param definition  The definition to search for
 * @returns  An array of ranges containing the definition keywords (if any)
 */
function searchDefinitionKeywords(document: vscode.TextDocument, position: vscode.Position, direction: Direction, definition: string): vscode.Range[] {
    const ret: vscode.Range[] = [];
    let line = position.line + direction; // Start from the next line
    let found = false;

    while ( ((line >= 0) && (line < document.lineCount)) && (!found)) {
        // Parse the line
        const text = document.lineAt(line).text.trim();
        const searchedKeyword = (direction === Direction.Up) ? '#define' : '#undef';

        // Look for the searched keyword
        // Split the line into words
        // #define xxxx : parsed = ['#define', 'xxxx']
        // #undef xxxx :  parsed = ['#undef', 'xxxx']
        const parsed = text.split(' '); 
        
        if(parsed.length <= 1){ // If there is only one word, continue
            line += direction; // Move to the next line
            continue;
        }

        // Check if the keyword is the one we are looking for and if the definition is the one we are looking for
        if ( (parsed[0]===searchedKeyword) && (parsed[1] === definition) ) {
            // Find the range of the keyword in line
            const range = getKeywordRange(document.lineAt(line), searchedKeyword);
            if (range) {
                ret.push(range); // Add the range of the keyword
                found = true; // Stop the search
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
function getKeywordRange(line: vscode.TextLine, keyword: string): vscode.Range | undefined {
    const index = line.text.indexOf(keyword);
    if (index !== -1) {
        return new vscode.Range(line.lineNumber, index, line.lineNumber, index + keyword.length);
    }
    return undefined;
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


//##################//
// String extension //
//##################//

/**
 * @brief Check if the string starts with an opening preprocessor directive
 * 
 * @returns True if the string starts with an opening preprocessor directive, false otherwise
 */
String.prototype.startsWithOpeningKeyword = function() {
    return dico.openingKeywords.some(keyword => this.trim().startsWith(keyword));
};

/**
 * @brief Check if the string starts with a closing preprocessor directive
 * 
 * @returns The keyword if the string starts with a closing preprocessor directive, false otherwise
 */
String.prototype.startsWithClosingKeyword = function() {
    return dico.closingKeywords.some(keyword => this.trim().startsWith(keyword));
};

/**
 * @brief Check if the string starts with a middle preprocessor directive
 * 
 * @returns The keyword if the string starts with a middle preprocessor directive, false otherwise
 */
String.prototype.startsWithMiddleKeyword = function() {
    return dico.middleKeywords.some(keyword => this.trim().startsWith(keyword));
};
