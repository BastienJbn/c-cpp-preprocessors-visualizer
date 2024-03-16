import * as vscode from 'vscode';

export class HighlightProvider implements vscode.DocumentHighlightProvider {
    provideDocumentHighlights(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentHighlight[]> {
        // Highlight the word under the cursor
        let word = document.getText(document.getWordRangeAtPosition(position));
        let matches: vscode.DocumentHighlight[] = [];
        let text = document.getText();
        let match;
        let reg = new RegExp(word, 'g');
        while (match = reg.exec(text)) {
            let startPos = document.positionAt(match.index);
            let endPos = document.positionAt(match.index + word.length);
            let range = new vscode.Range(startPos, endPos);
            matches.push(new vscode.DocumentHighlight(range, vscode.DocumentHighlightKind.Text));
        }
        return matches;
    }
}
