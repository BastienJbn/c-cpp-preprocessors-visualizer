import * as vscode from 'vscode';

let decorationType: vscode.TextEditorDecorationType;

export function activate(context: vscode.ExtensionContext) {
    console.log('[DEBUG]', 'Extension is active');

    decorationType = vscode.window.createTextEditorDecorationType({
        border: '1px solid grey',
    });

    let activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
        highlightPairs(activeEditor);
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (activeEditor) {
            highlightPairs(activeEditor);
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            highlightPairs(activeEditor);
        }
    }, null, context.subscriptions);

    vscode.window.onDidChangeTextEditorSelection(event => {
        if (activeEditor && event.textEditor === activeEditor) {
            highlightPairs(activeEditor);
        }
    }, null, context.subscriptions);
}

async function highlightPairs(editor: vscode.TextEditor) {
    const decorations: vscode.DecorationOptions[] = [];
    const position = editor.selection.active;

    const line = editor.document.lineAt(position.line);
    const text = line.text.trim();
    const start = line.range.start;
    const end = line.range.end;

    // Check if the cursor is at an #ifdef or #endif directive
    if (text.startsWith('#ifdef') || text.startsWith('#endif')) {
        const decoration = { range: new vscode.Range(start, end) };
        decorations.push(decoration);

        // Find and highlight the corresponding keyword
        const correspondingKeyword = findCorrespondingKeyword(editor.document, position);
        if (correspondingKeyword) {
            const decorationForCorrespondingKeyword = { range: correspondingKeyword };
            decorations.push(decorationForCorrespondingKeyword);
        }
    }

    editor.setDecorations(decorationType, decorations);
}

function findCorrespondingKeyword(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
    const line = document.lineAt(position.line);
    const text = line.text.trim();

    let targetKeyword: string;
    if (text.startsWith('#ifdef')) {
        targetKeyword = '#endif';
    } else if (text.startsWith('#endif')) {
        targetKeyword = '#ifdef';
    } else {
        return undefined;
    }

    for (let lineIndex = position.line + 1; lineIndex < document.lineCount; lineIndex++) {
        const currentLine = document.lineAt(lineIndex);
        const currentText = currentLine.text.trim();
        if (currentText.startsWith(targetKeyword)) {
            return currentLine.range;
        }
    }

    return undefined;
}

export function deactivate() {
    if (decorationType) {
        decorationType.dispose();
    }
}
