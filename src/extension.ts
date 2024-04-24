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
        this.id = 0;
    }

    public activate(context: vscode.ExtensionContext) {
        log('Extension is active');
        this.currEditor = vscode.window.activeTextEditor;
        this.visibleEditors = [...vscode.window.visibleTextEditors];
        
        this.registerCallbacks(context);

        // Parse all the visible editors
        this.visibleEditors.forEach(async e => {
            this.parser.update(e.document);
            
            // Display outlines
            if (e === this.currEditor) {
                this.displayOutlines(e);
            }

            // Display hints in all visible editors
            this.displayHints(e);
        });
    }

    public deactivate() {
        // Remove the outlines from the current editor
        if (this.currEditor) {
            this.removeOutlines(this.currEditor);
        }

        // Remove all hints from visible editors or only from the current editor if activeEditorOnly is set
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (cfg.get('hints.activeEditorOnly')) {
            if(this.currEditor) {
                const groups = this.parser.get(this.currEditor.document);
                if (groups) {
                    this.removeHints(this.currEditor, groups);
                }
            }
        } else {
            this.visibleEditors.forEach(async e => {
                const groups = this.parser.get(e.document);
                if (groups) {
                    this.removeHints(e, groups);
                }
            });
        }
        
        log('Extension is deactivated');
    }

    /**
     * @brief Register the callbacks for the extension
     * @param context  The extension context
     */
    private registerCallbacks(context: vscode.ExtensionContext) {
        // On every change of the active text editor
        vscode.window.onDidChangeActiveTextEditor(
            this.activeEditorChanged.bind(this),
            null,
            context.subscriptions
        );

        // On every change of the visible text editors
        vscode.window.onDidChangeVisibleTextEditors(
            this.visibleEditorsChanged.bind(this),
            null, 
            context.subscriptions);

        // On every change in the text document
        vscode.workspace.onDidChangeTextDocument(
            this.onDocumentModified.bind(this),
            null,
            context.subscriptions
        );

        // On every change in the text editor selection
        vscode.window.onDidChangeTextEditorSelection(event => {
            // Ignore if event is not from the current editor
            if (this.currEditor && (event.textEditor === this.currEditor)) {
                this.displayOutlines(this.currEditor); // update outlines
            }
        }, null, context.subscriptions);

        // On every change in the configuration (settings)
        vscode.workspace.onDidChangeConfiguration(
            this.onConfigurationChanged.bind(this),
            null, 
            context.subscriptions
        );
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

    /**
     * @brief The parser object
     * @details This object is used to parse the directives in text documents and keep track of them.
     * @see {@link Parser}
     */
    private parser: Parser;

    private id: number;

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
        editor.setDecorations(styles.outlineDecoType, keywordRanges);
        editor.setDecorations(styles.scrollbarDecoType, keywordRanges);
    }

    /**
     * @brief Remove all the outline decorations from the current editor
     */
    removeOutlines(editor: vscode.TextEditor) {
        editor.setDecorations(styles.outlineDecoType, []);
        editor.setDecorations(styles.scrollbarDecoType, []);
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
                if (!groups) {
                    return;
                }
                this.removeHints(this.currEditor, groups);
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
        removedEditors.forEach(e => {
            // TODO: Anything to do here?
        });

        // Process added editors
        addedEditors.forEach(e => {
            this.parser.update(e.document);
            this.visibleEditors.push(e);  // Add the new editors to the list
            this.displayHints(e);
        });
    }

    /**
     * @brief Document modified event handler
     * @param document The modified text document
     */
    private async onDocumentModified(event: vscode.TextDocumentChangeEvent) {
        log('Document modified: ', vscode.workspace.asRelativePath(event.document.fileName));

        const document = event.document;

        // Update the parser data
        this.parser.modify(document, event.contentChanges);

        // TODO: Optimize this by only updating the lines containing directives or contained in any directive group
    }

    /**
     * @brief Update the hints and outlines in the given editor
     * @param doc The text editor to update the hints and outlines in
     * @param oldGroups The old directive groups
     */
    private updateDisplay(doc: vscode.TextEditor, oldGroups: DirectiveGroup[]) {
        // Update hints
        this.removeHints(doc, oldGroups);
        this.displayHints(doc);

        // Update outlines
        if(doc === this.currEditor) {
            this.removeOutlines(doc);
            this.displayOutlines(doc);
        }
    }

    /**
     * @brief Configuration changed event handler
     */
    private onConfigurationChanged(event: vscode.ConfigurationChangeEvent) {
        // Filter out irrelevant changes
        if (!event.affectsConfiguration(extensionId)) {
            return;
        }

        // Remove all hints and outlines
        this.visibleEditors.forEach(e => {
            const groups = this.parser.get(e.document);
            if (groups) {
                this.removeHints(e, groups);
            }
            this.removeOutlines(e);
        });
    }
}
