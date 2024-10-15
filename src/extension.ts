import * as vscode from 'vscode';
import { Parser } from './Parser';
import { extensionId, log } from './Utils';
import { DirectiveGroup } from './DirectiveGroup';
import { Renderer } from './Renderer';

export class Extension {
    public activate(context: vscode.ExtensionContext) {
        log('Extension is active');
        this.currEditor = vscode.window.activeTextEditor;
        this.visibleEditors = [...vscode.window.visibleTextEditors];
        
        this.registerCallbacks(context);

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

    public deactivate() {
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
    private parsingPromises : Map<vscode.TextDocument, Promise<void> | undefined> = new Map();

    /**
     * @brief Editor changed event handler
     * @param newEditor The new text editor
     */
    private activeEditorChanged(newEditor: vscode.TextEditor | undefined) {
        if(!newEditor) {
            log('Editor changed to undefined');
        }
        else {
            log('Editor changed to', vscode.workspace.asRelativePath(newEditor.document.fileName));
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
            this.renderer.displayOutlines(this.currEditor, this.parser.get(this.currEditor.document));
            this.renderer.displayHints(this.currEditor, this.parser.get(this.currEditor.document));
        }
    }

    /**
     * @brief Visible editors changed event handler
     * @param newEditors The new list of visible text editors
     */
    private visibleEditorsChanged(newEditors: readonly vscode.TextEditor[]) {
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
            this.updateDocument(e.document).then(_ => {
                this.renderer.displayHints(e, this.parser.get(e.document));
            });
        });
    }

    /**
     * @brief Document modified event handler
     * @param document The modified text document
     */
    private onDocumentModified(event: vscode.TextDocumentChangeEvent) {
        if(event.contentChanges.length === 0) {
            return;
        }
        log('Document modified: ', vscode.workspace.asRelativePath(event.document.fileName));

        // Save current data
        let oldState = this.parser.get(event.document)!;

        // Update the parser data
        this.updateDocument(event.document).then(_ => {
            this.updateDisplay(this.currEditor!, oldState);
        });
    }

    /**
     * @brief Update the hints and outlines in the given editor
     * @param editor The text editor to update the hints and outlines in
     * @param oldGroups The old directive groups (can be ommitted if first time displaying this file)
     */
    private updateDisplay(editor: vscode.TextEditor, oldGroups: DirectiveGroup[] | undefined) {
        // Update hints
        if(oldGroups !== undefined && oldGroups.length >= 0) {
            this.renderer.removeHints(editor, oldGroups);
        }
        this.renderer.displayHints(editor, this.parser.get(editor.document));

        // Update outlines
        if(editor === this.currEditor) {
            
            if(oldGroups !== undefined) {
                this.renderer.removeOutlines(editor);
            }
            this.renderer.displayOutlines(editor, this.parser.get(editor.document));
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
    }

    /**
     * @brief Update the document index data. If a parsing operation was already ongoing on this document, cancel it and re-run.
     */
    private async updateDocument(document: vscode.TextDocument) {
        // Get promise corresponding to document
        let promise = this.parsingPromises.get(document);

        if (promise !== undefined) {
            this.controller.abort();
            await promise;
        }

        // Start new parsing operation and save it to map
        promise = this.parser.parseDocument(document, this.controller.signal);

        // Save promise in map
        this.parsingPromises.set(document, promise);

        // Return callback
        promise.then(_ => {
            // Reset promise, either when returning or cancelling
            // as it produce the same behaviour
            this.parsingPromises.set(document, undefined);
        })
        // Cancel callback
        .catch(() => {

        });

        return promise;
    }
}
