import * as vscode from 'vscode';

/**
 * Represents a hint in the editor.
 */
export class Hint {
    /**
     * @brief Decoration type of the hint
     */
    public DecoType: vscode.TextEditorDecorationType;

    /**
     * @brief Range of the hint
     */
    public Range: vscode.Range;

    /**
     * @brief Text of the hint
     */
    public Text: string;


    /**
     * Creates a new instance of the Hint class.
     * @param DecoType The decoration type for the hint.
     * @param Range The range of the hint in the editor.
     */
    constructor(Range: vscode.Range, Text: string) {
        this.Range = Range;
        this.Text = Text;

        this.DecoType = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: this.Text,
                color: 'grey',
                fontStyle: 'italic',
            },
        });
    }

    /**
     * @brief Negates the text of the hint.
     * 
     * @details
     * Adds a '!' character at the beginning of the hint's text.
     * If the hint already contains a '!' character, it is removed.
     */
    public NegateString(): void {
        if (this.Text[0] === '!') {
            this.Text = this.Text.slice(1);
        } else {
            this.Text = '!' + this.Text;
        }
    }
}