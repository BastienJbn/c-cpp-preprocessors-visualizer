import * as vscode from 'vscode';
import { outlinePairUnderCursor } from "./parser";

export function activate(context: vscode.ExtensionContext) {
    console.log('[DEBUG]', 'Extension is active');
    
    let activeEditor: vscode.TextEditor;

    // Triggered whenever the active text editor changes
    vscode.window.onDidChangeActiveTextEditor(editor => {
        // Editor should not be null
        if (!editor) {
            return;
        }

        // Language should be C or C++
        activeEditor = editor;
        const languageId = activeEditor.document.languageId;
        if ( !(languageId === 'c' || languageId === 'cpp') ) {
            return;
        }

        // Trigger the parser
        outlinePairUnderCursor(activeEditor);
    }, null, context.subscriptions);

    // Triggered whenever the content of a text document changes
    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            // Language should be C or C++
            const languageId = activeEditor.document.languageId;
            if ( !(languageId === 'c' || languageId === 'cpp') ) {
                return;
            }

            // Trigger the parser
            outlinePairUnderCursor(activeEditor);
        }
    }, null, context.subscriptions);

    // On every change in the text editor selection
    vscode.window.onDidChangeTextEditorSelection(event => {
        if (activeEditor && event.textEditor === activeEditor) {
            // Language should be C or C++
            const languageId = activeEditor.document.languageId;
            if ( !(languageId === 'c' || languageId === 'cpp') ) {
                return;
            }

            // Trigger the parser
            outlinePairUnderCursor(activeEditor);
        }
    }, null, context.subscriptions);
}

export function deactivate() {
    // Nothing to do
}
