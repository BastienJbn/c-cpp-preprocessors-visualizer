import * as vscode from 'vscode';
import { outlinePairUnderCursor } from "./parser";

export function activate(context: vscode.ExtensionContext) {
    console.log('[DEBUG]', 'Extension is active');
    
    let previousEditor = vscode.window.activeTextEditor;
    let activeEditor = vscode.window.activeTextEditor;

    // Triggered whenever the active text editor changes
    vscode.window.onDidChangeActiveTextEditor(editor => {
        previousEditor = activeEditor;
        activeEditor = editor;
        if (activeEditor) {
            outlinePairUnderCursor(activeEditor);
        }
    }, null, context.subscriptions);

    // Triggered whenever the content of a text document changes
    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            outlinePairUnderCursor(activeEditor);
        }
    }, null, context.subscriptions);

    // On every change in the text editor selection
    vscode.window.onDidChangeTextEditorSelection(event => {
        if (activeEditor && event.textEditor === activeEditor) {
            outlinePairUnderCursor(activeEditor);
        }
    }, null, context.subscriptions);
}

export function deactivate() {
    // Nothing to do
}
