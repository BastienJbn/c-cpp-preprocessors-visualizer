import * as vscode from 'vscode';

import * as dico from './dico';
import { extensionId, log } from './utils';
import { Hint } from './Hint';
import { DirectiveGroup } from './DirectiveGroup';
import { Directive, HintedDirective, OpeningDirective, MiddleDirective, ClosingDirective } from './Directive';

export class Parser {
    //##############//
    // Public Scope //
    //##############//

    constructor() {
        // Initialize attributes
        this.currEditor = vscode.window.activeTextEditor;
        this.visibleEditors = [...vscode.window.visibleTextEditors];
        this.dataMap = new Map();
    }
    
    /**
     * @brief Activate the parser. Parse opened files and set all callbacks.
     * @param context The extension context
     */
    public activate(context: vscode.ExtensionContext) {
        // variables init
        this.currEditor = vscode.window.activeTextEditor;
        this.visibleEditors = [...vscode.window.visibleTextEditors];
    
        // Trigger the parser on extension activation
        this.parseEditor(this.visibleEditors);
        this.outlineUnderCursor(this.currEditor);

        // Display the hints in current editor only if activeEditorOnly is set to true
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (cfg.get('hints.activeEditorOnly')) {
            if(this.currEditor) {
                this.displayHints(this.currEditor);
            }
        }
        // Otherwise, display hints in all visible editors
        else {
            this.displayHints(this.visibleEditors);
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
                this.removeHints(this.currEditor);
                this.updateData(this.currEditor);
                this.outlineUnderCursor(this.currEditor);
                this.displayHints(this.currEditor);
            }
        }, null, context.subscriptions);
    
        // On every change in the text editor selection
        vscode.window.onDidChangeTextEditorSelection(event => {
            if (this.currEditor && (event.textEditor === this.currEditor)) {
                this.outlineUnderCursor(this.currEditor);
            }
        }, null, context.subscriptions);
    
        // On every change in the configuration (settings)
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(extensionId)) {
                this.removeHints(this.visibleEditors);  // Remove all hints
                this.parseEditor(this.visibleEditors);  // Parse all visible editors
                this.displayHints(this.visibleEditors); // Display all hints
            }
        }, null, context.subscriptions);
    }
    
    /**
     * @brief Deactivate the parser. Remove all hints and outlines.
     */
    public deactivate() {
        this.removeHints(this.visibleEditors);  // Remove all hints
        this.removeOutlines();                  // Remove all outlines
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

    private readonly scrollbarDecoType: vscode.TextEditorDecorationType =
    vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        overviewRulerColor: 'grey',
    });

    /**
     * @var dataMap
     * @brief A map where each key is a vscode.TextEditor and each value is a DirectiveGroup Array.
     * @type {Map<vscode.TextEditor, DirectiveGroup[]>}
     * @see {@link DirectiveGroup}
     * 
     * @details 
     * This map keeps track of the directive groups for each visible text editor. 
     * It is used to store all directives of a file, in their corresponding group.
     */
    private dataMap: Map<vscode.TextEditor, DirectiveGroup[]>;

    /*** Methods ***/

    /**
     * @brief Parse the whole file
     * @param editor The text editor to parse
     */
    parseEditor(editor: vscode.TextEditor | vscode.TextEditor[] | undefined) {
        // Check Config
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (!cfg.get('enable')) {
            return;
        }

        // Ensure editor is defined
        if (!editor) {
            return;
        }

        // Ensure we always work with an array
        const editors = Array.isArray(editor) ? editor : [editor];

        // Parse the given editor(s)
        editors.forEach(e => {
            const doc = e.document;
            const groups = this.parseFile(doc);
            this.dataMap.set(e, groups);
        });
    }

    /**
     * @brief Parse the given document and search for the directive groups
     * @param document The document to parse
     * @returns An array of DirectiveGroup objects. Can be empty.
     */
    parseFile(document: vscode.TextDocument): DirectiveGroup[] {
        let ret: DirectiveGroup[] = [];

        log('Parsing file:', vscode.workspace.asRelativePath(document.fileName));

        // Current nesting level
        let currLevel = 0;  

        // Lifo of current groups (index correspond to a relative nesting level)
        let currGroups: DirectiveGroup[] = [new DirectiveGroup(undefined, 0)];

        // Parse line by line
        for (let line = 0; line < document.lineCount; line++) {
            const text = document.lineAt(line).text;
            
            // Parse the line 
            const directive = this.parseLine(document.lineAt(line), currGroups[currLevel]);

            // If there is no directive, continue to the next line
            if(!directive) {
                continue;
            }

            // Opening directive found
            if (directive instanceof OpeningDirective) {
                // Create a new group
                const newGroup = new DirectiveGroup([directive], currLevel + 1);
                currGroups.push(newGroup);
                currLevel++;
            }
            // Middle directive found
            else if (directive instanceof MiddleDirective) {
                // Add the directive to the current group
                currGroups[currLevel].directives.push(directive);
            }
            // Closing directive found
            else if (directive instanceof ClosingDirective) {
                // Add the directive to the current group
                currGroups[currLevel].directives.push(directive);

                // Add the group to the return array
                ret.push(currGroups.pop()!);

                // Update nesting level
                currLevel -= 1;
            }
        }
        return ret;
    }

    /**
     * @brief Parse the line and return the corresponding directive
     * @param line  The line to parse
     * @param group  The group to which the directive belongs
     * @returns  The nesting level update (can be negative), or undefined if the directive is not valid
     */
    parseLine(line: vscode.TextLine, group: DirectiveGroup | undefined) : Directive | undefined {
        let ret: Directive | undefined = undefined;
        
        const text = line.text.trim();
            
        // Opening keyword detected
        if (text.startsWithOpeningKeyword()) {
            // Find the range of the keyword in line
            const directiveRg = getKeywordRange(line, dico.openingKeywords);
            if(!directiveRg) {
                log('Error: Opening keyword not found in line', line);
                return undefined;
            }

            // Find the param string
            const paramStr = getConditionText(line);
            
            // Create the Directive object
            ret = new OpeningDirective(directiveRg, paramStr);
        }

        // Middle keyword detected
        else if (text.startsWithMiddleKeyword()) {
            if (group !== undefined && group.directives.length > 0) {
                // Find the directive range
                const directiveRg = getKeywordRange(line, dico.middleKeywords);
                if(!directiveRg) {
                    log('Error: Middle keyword not found in line', line);
                    return undefined;
                }

                // Find the param string
                const paramStr = getConditionText(line);

                // Find the hint and its range
                const hintRg = new vscode.Range(line.lineNumber, directiveRg.end.character, line.lineNumber, line.range.end.character);
                let hint = new Hint("", hintRg);
                if (text.startsWith('#else')) {
                    // Hint str is the negation of the last directive hint
                    hint.text = this.getHintOfLastDirective(group)!;
                    hint.NegateString();
                }
                else if (text.startsWith('#elif')) {
                    // Hint text is the new condition
                    hint.text = getConditionText(line);
                    hint.modified = true;
                }

                // Create the Directive object
                ret = new MiddleDirective(directiveRg, paramStr, hint);
            }
            else {
                // TODO: Indicate bad syntax with squiggly underline
            }
        }

        // Closing keyword detected
        else if (text.startsWithClosingKeyword()) {
            if (group !== undefined && group.directives.length > 0) {
                // Find the directive range
                const directiveRg = getKeywordRange(line, dico.closingKeywords);
                if(!directiveRg) {
                    log('Error: Closing keyword not found in line', line);
                    return undefined;
                }

                // Find the param string
                const paramStr = getConditionText(line);

                // Find the hint. Text is equal to the last directive hint
                const hintRg = new vscode.Range(line.lineNumber, directiveRg.end.character, line.lineNumber, line.range.end.character);
                const hintStr = this.getHintOfLastDirective(group)!;
                const hint = new Hint(hintStr, hintRg);

                // Create the Directive object
                ret = new ClosingDirective(directiveRg, paramStr, hint);
            }
            else {
                // TODO: Indicate bad syntax with squiggly underline
            }
        }

        return ret;
    }
    
    /**
     * @brief Add a directive to a group at a given position
     * @param directive  The directive to add
     * @param group  The group to add the directive to
     * @param position  The position to add the directive at (optional)
     */
    addDirectiveToGroup(directive: Directive, group: DirectiveGroup, position?: number) {
        // If position is not defined, add the directive at the end of the group
        if (position === undefined) {
            position = group.directives.length;
        }

        // Check for impossible positions
        if (directive instanceof OpeningDirective && position > 0) {
            log('Error: Cannot add an opening directive in the middle of a group');
            return;
        }
        if (directive instanceof ClosingDirective && position < group.directives.length) {
            log('Error: Cannot add a closing directive in the middle of a group');
            return;
        }
        if (directive instanceof MiddleDirective && position === 0) {
            log('Error: Cannot add a middle directive at the beginning of a group');
            return;
        }

        // Add the directive to the group at the given position
        group.directives.splice(position, 0, directive);

        // TODO: Update all the hints below the added directive
    }

    /**
     * @brief Update the data of the given editor. Should update display afterwards.
     * @param editor  The text editor to update
     */
    updateData(editor: vscode.TextEditor) {
        // Re-parse the file
        const groups = this.parseFile(editor.document);
        this.dataMap.set(editor, groups);

        // FIXME: This is not efficient. Should only update the changed part of the file.
    }

    /**
     * @brief Highlight the matching preprocessor directives under the cursor (if any)
     * @param editor The text editor to highlight the pair in
     */
    outlineUnderCursor(editor: vscode.TextEditor | undefined) {
        // If the extension or the feature are disabled, do nothing
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (!cfg.get('enable') || !cfg.get('outlines.enable')) {
            return;
        }

        // Ensure editor is defined
        if (!editor) {
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
        
        // Get the corresponding group in the dataMap
        const fileGroups = this.dataMap.get(editor);
        if (!fileGroups) {
            return;
        }
        const group = fileGroups.find(
            g => g.directives.some(
                r => r.range.start.line <= position.line && r.range.end.line >= position.line
            )
        );
        
        // Get the range to outline
        let keywordRanges: vscode.Range[] = [];
        if (group) {
            keywordRanges = group.directives.map(d => d.range);
        }
        // Set the decorations to detected ranges, or remove them if none 
        editor.setDecorations(this.outlineDecoType, keywordRanges);
        editor.setDecorations(this.scrollbarDecoType, keywordRanges);
    }

    /**
     * @brief Remove all the outline decorations from the current editor
     */
    removeOutlines() {
        if (this.currEditor) {
            this.currEditor.setDecorations(this.outlineDecoType, []);
            this.currEditor.setDecorations(this.scrollbarDecoType, []);
        }
    }

    /**
     * @brief Display the hints in the editor
     * @param editor The text editor to display the hints in
     */
    displayHints(editor: vscode.TextEditor | vscode.TextEditor[] | undefined) {
        // Check Config
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (!cfg.get('enable') || !cfg.get('hints.enable')) {
            return;
        }

        // Ensure editor is defined
        if (!editor) {
            return;
        }

        // Ensure we always work with an array
        const editors = Array.isArray(editor) ? editor : [editor];

        // Display the hints in the given editors
        editors.forEach(e => {
            // If activeEditorOnly, display in the current editor only
            if (cfg.get('hints.activeEditorOnly') && e !== this.currEditor) {
                return;
            }

            const groups = this.dataMap.get(e);
            if (!groups) {
                return;
            }

            groups.forEach(g => {
                g.directives.forEach(d => {
                    // Display the hint for middle and closing directives
                    if (d instanceof HintedDirective) {
                        e.setDecorations(d.hint.decoType, [d.hint.range]);
                    }
                });
            });
        });
    }

    /**
     * @brief Remove all the hint decorations from the given editor(s)
     */
    removeHints(editor: vscode.TextEditor | vscode.TextEditor[]) {
        // Ensure we always work with an array
        const editors = Array.isArray(editor) ? editor : [editor];

        // Remove the hints from the given editors
        editors.forEach(e => {
            const groups = this.dataMap.get(e);
            if (!groups) {
                return;
            }

            groups.forEach(g => {
                g.directives.forEach(d => {
                    // Remove the hint for middle and closing directives
                    if (d instanceof HintedDirective) {
                        e.setDecorations(d.hint.decoType, []);
                    }
                });
            });
        });
    }

    /**
     * @brief Editor changed event handler
     * @param newEditor The new text editor
     */
    activeEditorChanged(newEditor: vscode.TextEditor | undefined) {
        if(!newEditor) {
            log('Editor changed to undefined');
        }
        else {
            log('Editor changed to', vscode.workspace.asRelativePath(newEditor.document.fileName));
        }
        
        this.removeOutlines();

        // Remove the hints if the setting is set to activeEditorOnly and display in the new file
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (cfg.get('hints.activeEditorOnly')) {
            if(this.currEditor) {
                this.removeHints(this.currEditor);
            }
        }

        // Set the new editor as the current editor
        this.currEditor = newEditor;

        // Update new editor
        this.outlineUnderCursor(this.currEditor);
        this.displayHints(this.currEditor);
    }

    /**
     * @brief Visible editors changed event handler
     * @param newEditors The new list of visible text editors
     */
    visibleEditorsChanged(newEditors: readonly vscode.TextEditor[]) {
        log('Visible editors changed');

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
            this.parseEditor(e);  // Parse the whole file
            this.displayHints(e);  // Display the hints
        });
    }

    /**
     * @brief Get the directive at the given position
     * @param editor The text editor to search in
     * @param position The position to search from
     * @returns A {@link DirectiveGroup}, or undefined if not found
     */
    getDirectiveFromPosition(editor: vscode.TextEditor, position: vscode.Position): Directive | undefined {
        const groups = this.dataMap.get(editor);
        if (!groups) {
            return undefined;
        }
        return this.getGroupFromPosition(editor, position)?.directives.find(
            d => d.range.start.line <= position.line && d.range.end.line >= position.line
        );
    }

    /**
     * @brief Get the group that encapsulate the position
     * @param editor The text editor to search in
     * @param position The position to search from
     * @returns A {@link DirectiveGroup}, or undefined if not found
     */
    getGroupFromPosition(editor: vscode.TextEditor, position: vscode.Position): DirectiveGroup | undefined {
        let ret: DirectiveGroup | undefined = undefined;
        
        const groups = this.dataMap.get(editor);
        if (!groups) {
            return undefined;
        }
        
        // Find groups that contains the position
        const containingGroups = groups.filter(g => {
                // Check if the position is between the first and last directive of the group
                if (g.directives[0].range.start.line <= position.line && g.directives[g.directives.length - 1].range.end.line >= position.line) {
                    return true;
                }
                else {
                    return false;
                }
            }
        );

        // Return the group with the highest nesting level
        if (containingGroups.length > 0) {
            ret = containingGroups.reduce((prev, curr) => prev.level > curr.level ? prev : curr);
        }

        return ret;
    }

    /**
     * @brief Get the hint of the last directive in the group
     * @param group The group to search in
     * @returns The hint text of the last directive, or undefined if the group is empty
     */
    getHintOfLastDirective(group: DirectiveGroup): string | undefined {
        if (group.directives.length > 0) {
            const lastDirective = group.directives[group.directives.length - 1];
            
            // Handle the case where the last directive is a middle or closing directive
            if (lastDirective instanceof HintedDirective) {
                return lastDirective.hint.text;
            }
            // Handle the case where the last directive is an opening directive
            else if (lastDirective instanceof Directive) {
                return lastDirective.paramStr;
            }
        }
        return undefined;
    }

}

/**
 * @brief Parse the given line and search for the given keyword(s) (matching the whole word)
 * 
 * @param line The line to parse
 * @param keyword The keyword(s) to search for
 * @returns The range of the keyword if found, undefined otherwise
 */
function getKeywordRange(line: vscode.TextLine, keyword: string | string[]): vscode.Range | undefined {
    let ret: vscode.Range | undefined = undefined;

    // Ensure keyword is an array
    const keywords = Array.isArray(keyword) ? keyword : [keyword];
    
    // Parse the directive
    const directive = line.text.trim().split(' ')[0];

    let i = 0;
    let kw = keywords[i];
    while (!ret && i < keywords.length) {
        if (directive === kw) {
            ret = new vscode.Range(
                line.lineNumber, line.firstNonWhitespaceCharacterIndex,
                line.lineNumber, line.firstNonWhitespaceCharacterIndex + kw.length
            );
        }
        i++;
        kw = keywords[i];
    }

    return ret;
}

/**
 * @brief Parse the text after the directive keyword
 * @param line The line to parse
 * @returns The condition string
 */
function getConditionText(line: vscode.TextLine): string {
    const words = line.text.trim().split(' ');
    if (words.length > 1) {
        return words.slice(1).join(' ');
    }
    return '';
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
