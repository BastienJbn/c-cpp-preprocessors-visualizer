import * as vscode from 'vscode';
import { Parser, ParseDiff } from './parser';
import { extensionId, log } from './Utils';
import { Renderer } from './Renderer';
import * as Styles from './Styles';

export class Extension {
    public activate(context: vscode.ExtensionContext) {
        log('Extension is active');
        this.currEditor = vscode.window.activeTextEditor;
        this.visibleEditors = [...vscode.window.visibleTextEditors];
        
        this.registerCallbacks(context);

        // Load Renderer config
        const cfg = vscode.workspace.getConfiguration(extensionId);
        this.renderer.enable = cfg.get('enable')!;
        this.renderer.enableHints = cfg.get('hints.enable')!;
        this.renderer.enableOutlines = cfg.get('outlines.enable')!;

        // Parse all the visible editors
        this.visibleEditors.forEach(async editor => {
            this.updateDocument(editor.document).then(_ => {
                // Display outlines
                if (editor === this.currEditor) {
                    this.renderer.displayOutlines(editor, this.parser.get(editor.document));
                }
    
                // Display hints in all visible editorsremoveHints
                this.renderer.displayHints(editor, this.parser.get(editor.document));
            });
        });
    }

    public async deactivate() {
        // Remove the outlines from the current editor
        if (this.currEditor) {
            this.renderer.removeOutlines(this.currEditor);
        }

        // Remove all hints from visible editors or only from the current editor if activeEditorOnly is set
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (cfg.get('hints.activeEditorOnly')) {
            if(this.currEditor) {
                const groups = this.parser.get(this.currEditor.document);
                if (groups) {
                    this.renderer.removeHints(this.currEditor, groups);
                }
            }
        } else {
            this.visibleEditors.forEach(async e => {
                const groups = this.parser.get(e.document);
                if (groups) {
                    this.renderer.removeHints(e, groups);
                }
            });
        }
        
        // log(`Abort all running parsing.`);
        // log(`${this.parsingPromises.size} Running promises.`);

        // this.controller.abort();
        // await Promise.all(this.parsingPromises);

        Styles.outlineDecoType.dispose();
        Styles.scrollbarDecoType.dispose();

        this.parser.dispose();
        
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
                this.renderer.displayOutlines(this.currEditor, this.parser.get(this.currEditor.document)); // update outlines
            }
        }, null, context.subscriptions);

        // On every change in the configuration (settings)
        vscode.workspace.onDidChangeConfiguration(
            this.onConfigurationChanged.bind(this),
            null, 
            context.subscriptions
        );

        vscode.workspace.onDidCloseTextDocument(event => {

        }, null, context.subscriptions);
    }

    /**
     * @brief The current text editor
     * @details This attribute is used to keep track of the current text editor.
     * @see {@link vscode.TextEditor}
     */
    private currEditor: vscode.TextEditor | undefined = undefined;

    /**
     * @brief The list of visible text editors
     * @details This list is used to keep track of the visible text editors.
     * @see {@link vscode.TextEditor}
     */
    private visibleEditors: vscode.TextEditor[] = [];

    /**
     * @brief The parser object
     * @details This object is used to parse the directives in text documents and keep track of them.
     * @see {@link Parser}
     */
    private parser: Parser = new Parser();

    /**
     * @brief The renderer object
     * @details This object is used to render Outline, Hints and ScrollBar decorations.
     * @see {@link Renderer}
     */
    private renderer: Renderer = new Renderer();

    /**
     * @brief The controller in charge of cancelling parsing operations.
     */
    private controller: AbortController = new AbortController();

    /**
     * @brief Map of parsing promise per document. The promise is valid when a parsing operation is running, or undefined otherwise.
     */
    private parsingPromises : Map<vscode.TextDocument, Promise<ParseDiff | undefined>> = new Map();

    /**
     * @brief Editor changed event handler
     * @param newEditor The new text editor
     */
    private async activeEditorChanged(newEditor: vscode.TextEditor | undefined) {
        if(!newEditor) {
            log('Active Editor changed to undefined');
        }
        else {
            log('Active Editor changed to', vscode.workspace.asRelativePath(newEditor.document.fileName));
        }
        
        // Remove the outlines from the old editor
        if (this.currEditor) {
            this.renderer.removeOutlines(this.currEditor);
        }

        // If the setting is set to activeEditorOnly, remove hints from old editor
        const cfg = vscode.workspace.getConfiguration(extensionId);
        if (cfg.get('hints.activeEditorOnly')) {
            if(this.currEditor) {
                const groups = this.parser.get(this.currEditor.document);
                if (!groups) {
                    return;
                }
                this.renderer.removeHints(this.currEditor, groups);
            }
        }

        // Set the new editor as the current editor
        this.currEditor = newEditor;

        // Update new editor
        if(this.currEditor) {
            let index = this.parser.get(this.currEditor.document);
            if (index === undefined) {
                let ret = await this.updateDocument(this.currEditor.document);
                if (ret !== undefined) {
                    this.updateDisplay(this.currEditor, ret);
                }
            } else {
                this.renderer.displayOutlines(this.currEditor, index);
                this.renderer.displayHints(this.currEditor, index);
            }
        }
    }

    /**
     * @brief Visible editors changed event handler
     * @param newEditors The new list of visible text editors
     */
    private async visibleEditorsChanged(newEditors: readonly vscode.TextEditor[]) {
        log('Visible editors changed (', newEditors.length, 'displayed)');

        // Compare differences between the old and new visible editors
        const oldEditors = this.visibleEditors;
        const addedEditors = newEditors.filter(e => !oldEditors.includes(e));
        const removedEditors = oldEditors.filter(e => !newEditors.includes(e));
        
        // Delete removed editors from visibleEditors list
        this.visibleEditors = oldEditors.filter(e => !removedEditors.includes(e));

        // Hide hints of removedEditors
        this.renderer.displayHints(removedEditors, []);

        // Add the new editors to the list of visible ones
        this.visibleEditors.concat(addedEditors);
    }

    /**
     * @brief Document modified event handler
     * @param document The modified text document
     */
    private onDocumentModified(event: vscode.TextDocumentChangeEvent) {
        if(event.contentChanges.length === 0) {
            return;
        }

        // Update the parser data
        this.updateDocument(event.document).then(diffs => {
            // Only update the display if parsing was successful
            if (diffs !== undefined) {
                this.updateDisplay(this.currEditor!, diffs);
            } else {
                // Handle the error case if needed, e.g., show a message to the user
                log('Error updating document display: parsing failed.');
            }
        });

        log('Document modified: ', vscode.workspace.asRelativePath(event.document.fileName));
    }

    /**
     * @brief Update the hints and outlines in the given editor
     * @param editor The text editor to update the hints and outlines in
     * @param diff The ParseDiff containing old groups to remove and new groups to display
     */
    private updateDisplay(editor: vscode.TextEditor, diff: ParseDiff) {
        const [oldGroups, newGroups] = diff; // Destructure the ParseDiff tuple

        // Update hints
        if (oldGroups.length > 0) {
            this.renderer.removeHints(editor, oldGroups);
        }
         // Display new groups instead
        this.renderer.displayHints(editor, newGroups);

        // Update outlines
        if (editor === this.currEditor) {
            if (oldGroups.length > 0) {
                this.renderer.removeOutlines(editor);
            }
             // Display new groups instead
            this.renderer.displayOutlines(editor, newGroups);
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
                this.renderer.removeHints(e, groups);
            }
            this.renderer.removeOutlines(e);
        });

        // Update renderer config
        const cfg = vscode.workspace.getConfiguration(extensionId);
        this.renderer.enable = cfg.get('enable')!;
        this.renderer.enableHints = cfg.get('hints.enable')!;
        this.renderer.enableOutlines = cfg.get('outlines.enable')!;
    }

    /**
     * @brief Update the document index data. If a parsing operation was already ongoing on this document, cancel it and re-run.
     */
    private async updateDocument(document: vscode.TextDocument): Promise<ParseDiff | undefined>
    {
        // Get promise corresponding to document
        let promise = this.parsingPromises.get(document);

        // If any running, abort it
        if (promise !== undefined)
        {
            log(`Abort parsing for "${document.fileName}".`);
            log(`${this.parsingPromises.size} Running promises.`);
            this.controller.abort(); // Abort the ongoing operation
            await promise;  // Ignore return value as parsing will be restarted
        }

        // Call the new updateDocument function from the Parser class
        promise = this.parser.updateDocument(document, this.controller.signal);

        // Save promise
        this.parsingPromises.set(document, promise);

        log(`Start parsing. ${this.parsingPromises.size} Running promises.`);

        promise.then(_ => {
            this.parsingPromises.delete(document);
            log(`Parsing done for "${document.fileName}".`);
            log(`${this.parsingPromises.size} Running promises.`);
        });

        // Return promise resolution
        return promise;
    }
}
