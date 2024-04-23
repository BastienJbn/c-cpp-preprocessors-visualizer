import * as vscode from 'vscode';
import { Parser } from './Parser';
import { extensionId, log } from './utils';
import * as styles from './Styles';
import { HintedDirective } from './Directive';
import { DirectiveGroup } from './DirectiveGroup';

export class Extension {
    constructor() {
        this.parser = new Parser();
        this.currEditor = undefined;
        this.visibleEditors = [];
    }

    public activate(context: vscode.ExtensionContext) {
        log('Extension is active');
        this.currEditor = vscode.window.activeTextEditor;
        this.visibleEditors = [...vscode.window.visibleTextEditors];
        
        this.registerCallbacks(context);

        // Display hints and outlines
        if (this.currEditor) {
            this.displayOutlines(this.currEditor);
        }
        this.visibleEditors.forEach(e => {
            this.displayHints(e);
        });
    }

    public deactivate() {
        log('Extension is deactivated');
        // TODO Remove all decorations. Free parser resources.
    }

    /**
     * @brief Register the callbacks for the extension
     * @param context  The extension context
     */
    private registerCallbacks(context: vscode.ExtensionContext) {
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
            // Ignore if the event is not from the current editor
            if (!this.currEditor || (event.document !== this.currEditor.document)) {
                return;
            }

            // Ignore if there is no content change
            if (event.contentChanges.length === 0) {
                return;
            }

            this.onDocumentModified(event.document);

        }, null, context.subscriptions);

        // On every change in the text editor selection
        vscode.window.onDidChangeTextEditorSelection(event => {
            // Ignore if event is not from the current editor
            if (this.currEditor && (event.textEditor === this.currEditor)) {
                this.displayOutlines(this.currEditor); // update outlines
            }
        }, null, context.subscriptions);

        // On every change in the configuration (settings)
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(extensionId)) {
                this.onConfigurationChanged();
            }
        }, null, context.subscriptions);
    }

    /**
     * @brief The current text editor
     * @details This attribute is used to keep track of the current text editor.
     * @see {@link vscode.TextEditor}
     */
    private currEditor: vscode.TextEditor | undefined;

    /**
     * @brief The list of visible text editors
     * @details This list is used to keep track of the visible text editors.
     * @see {@link vscode.TextEditor}
     */
    private visibleEditors: vscode.TextEditor[];

    private parser: Parser;

    /**
     * @brief Display or Update the outlines (if any)
     * @param editor The text editor to highlight the pair in
     * @details 
     * Get the group of directives under cursor and apply the outline decoration.
     * If there is a selection, remove the outlines.
     */
    displayOutlines(editor: vscode.TextEditor) {
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
            editor.setDecorations(styles.outlineDecoType, []); // Remove the outlines
            return;
        }

        const position = editor.selection.active;
        
        // Get the corresponding group in the dataMap
        const fileGroups = this.parser.get(editor.document);
        if (!fileGroups) {
            throw new Error('Parsing not done for the current file yet');
            // TODO handle error
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
        editor.setDecorations(styles.outlineDecoType, keywordRanges);
        editor.setDecorations(styles.scrollbarDecoType, keywordRanges);
    }

    /**
     * @brief Remove all the outline decorations from the current editor
     */
    removeOutlines(editor: vscode.TextEditor) {
        if (editor) {
            editor.setDecorations(styles.outlineDecoType, []);
            editor.setDecorations(styles.scrollbarDecoType, []);
        }
    }

    /**
     * @brief Display the hints in the editor
     * @param editor The text editor to display the hints in
     */
    displayHints(editor: vscode.TextEditor | vscode.TextEditor[]) {
        // Check Config
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (!cfg.get('enable') || !cfg.get('hints.enable')) {
            return;
        }

        // Ensure we always work with an array
        const editors = Array.isArray(editor) ? editor : [editor];

        // Display the hints in the given editors
        editors.forEach(e => {
            const doc = e.document;

            // If activeEditorOnly, display in the current editor only
            if (cfg.get('hints.activeEditorOnly') && e !== this.currEditor) {
                return;
            }

            const groups = this.parser.get(doc);
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
    removeHints(editor: vscode.TextEditor, groups: DirectiveGroup[]) {
        groups.forEach(g => {
            g.directives.forEach(d => {
                // Remove the hint for middle and closing directives
                if (d instanceof HintedDirective) {
                    editor.setDecorations(d.hint.decoType, []);
                }
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
        
        // Remove the outlines from the old editor
        if (this.currEditor) {
            this.removeOutlines(this.currEditor);
        }

        // If the setting is set to activeEditorOnly, remove hints from old editor
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (cfg.get('hints.activeEditorOnly')) {
            if(this.currEditor) {
                const groups = this.parser.get(this.currEditor.document);
                if (groups) {
                    this.removeHints(this.currEditor, groups);
                }
            }
        }

        // Set the new editor as the current editor
        this.currEditor = newEditor;

        // Update new editor
        if(this.currEditor) {
            this.displayOutlines(this.currEditor);
            this.displayHints(this.currEditor);
        }
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
            this.displayHints(e);
        });
    }

    /**
     * @brief Document modified event handler
     * @param document The modified text document
     */
    onDocumentModified(document: vscode.TextDocument) {
        // TODO Parse the document and update the hints and outlines

        // Get the old and new groups
        const oldGroups = this.parser.get(document);
        if (oldGroups === undefined) {
            throw new Error('Modified document is not known to the parser yet!');
        }
        this.parser.update(document);

        // Find in wich visible editors the document is open, and update hints and outlines
        this.visibleEditors.filter(e => e.document === document).forEach(e => {
            // Remove hints and outlines
            this.removeHints(e, oldGroups);
            this.removeOutlines(e);
            // Display hints and outlines
            this.displayHints(e);
            this.displayOutlines(e);
        });
    }

    /**
     * @brief Configuration changed event handler
     */
    private onConfigurationChanged() {
        // Remove all hints and outlines
        this.visibleEditors.forEach(e => {
            const groups = this.parser.get(e.document);
            if (!groups) {
                return;
            }

            this.removeHints(e, groups);
            this.removeOutlines(e);
        });

        // TODO Trigger the parser for all the files. Display hints and outlines
    }
}
