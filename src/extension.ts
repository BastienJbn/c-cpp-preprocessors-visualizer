import * as vscode from 'vscode';
import { Parser } from './Parser';
import { extensionId, log } from './utils';
import * as styles from './Styles';
import { HintedDirective } from './Directive';
import { DirectiveGroup } from './DirectiveGroup';
import { resolve } from 'path';
import { EventEmitter } from 'events';
import { rejects } from 'assert';

export class Extension {
    constructor() {
        this.parser = new Parser();
        this.currEditor = undefined;
        this.visibleEditors = [];
        this.cancelEmitter = new EventEmitter();
    }

    public activate(context: vscode.ExtensionContext) {
        log('Extension is active');
        this.currEditor = vscode.window.activeTextEditor;
        this.visibleEditors = [...vscode.window.visibleTextEditors];
        
        this.registerCallbacks(context);

        // Display outlines
        if (this.currEditor) {
            this.displayOutlines(this.currEditor);
        }

        // Display hints in all visible editors
        this.displayHints(this.visibleEditors);
    }

    public deactivate() {
        log('Extension is deactivated');

        // if (this.currEditor) {
        //     this.removeOutlines(this.currEditor);
        // }
        
        // this.visibleEditors.forEach(async e => {
        //     const groups = await this.parser.get(e.document);
        //     this.removeHints(e, groups);
        // });

        // TODO Free parser resources
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
            this.onDocumentModified(event);
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

    /**
     * @brief The parser object
     * @details This object is used to parse the directives in text documents and keep track of them.
     * @see {@link Parser}
     */
    private parser: Parser;

    private cancelEmitter: EventEmitter;

    private parsingPromise: Promise<any> | undefined;

    /**
     * @brief Display or Update the outlines (if any)
     * @param editor The text editor to highlight the pair in
     * @details 
     * Get the group of directives under cursor and apply the outline decoration.
     * If there is a selection, remove the outlines.
     */
    async displayOutlines(editor: vscode.TextEditor) {
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
        const fileGroups = await this.parser.get(editor.document);
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
        editors.forEach(async e => {
            const doc = e.document;

            // If activeEditorOnly, display in the current editor only
            if (cfg.get('hints.activeEditorOnly') && e !== this.currEditor) {
                return;
            }

            const groups = await this.parser.get(doc);

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
    async activeEditorChanged(newEditor: vscode.TextEditor | undefined) {
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
                const groups = await this.parser.get(this.currEditor.document);
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
            this.visibleEditors.push(e);  // Add the new editors to the list
            this.displayHints(e);
        });
    }

    /**
     * @brief Document modified event handler
     * @param document The modified text document
     */
    private onDocumentModified(event: vscode.TextDocumentChangeEvent) {
        log('Document modified at time: ', new Date().toLocaleTimeString());

        // Ignore if the event is not from the current editor
        if (!this.currEditor || (event.document !== this.currEditor.document)) {
            return;
        }

        // Ignore if there is no content change
        if (event.contentChanges.length === 0) {
            return;
        }

        const document = event.document;

        // Get the old groups
        this.parser.get(document)
            .catch(() => { return []; })
            .then(oldGroups => {
                // Update the parser and get the new groups
                this.parser.update(document).then(() => {
                    // Find in which visible editors the document is open, and update hints and outlines
                    this.visibleEditors.filter(e => e.document === document).forEach(e => {
                        this.updateDisplay(e, oldGroups);
                    });
                });
            });

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
    private onConfigurationChanged() {
        // Remove all hints and outlines
        this.visibleEditors.forEach(async e => {
            const groups = await this.parser.get(e.document);
            this.removeHints(e, groups);
            this.removeOutlines(e);
        });
    }
}
