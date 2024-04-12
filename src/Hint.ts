import * as vscode from 'vscode';

/**
 * Represents a hint in the editor.
 */
export class Hint {
    /**
     * The decoration type for the hint.
     */
    public DecoType: vscode.TextEditorDecorationType;
    /**
     * The range of the hint in the editor.
     */
    public Range: vscode.Range;

    /**
     * Creates a new instance of the Hint class.
     * @param DecoType The decoration type for the hint.
     * @param Range The range of the hint in the editor.
     */
    constructor(DecoType: vscode.TextEditorDecorationType, Range: vscode.Range) {
        this.DecoType = DecoType;
        this.Range = Range;
    }
}