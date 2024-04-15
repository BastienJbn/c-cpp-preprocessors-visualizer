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
     * @brief Text of the hint
     */
    public Text: string;

    /**
     * @brief Boolean indicating if the hint is negated
     * 
     * @details
     * If true, the hint text is negated.
     * Example : 
     * - hint text = "FOO"
     * - negated text = "!FOO"
     */
    public negated: boolean = false;

    /**
     * @brief Boolean indicating if the hint is modified
     * 
     * @details
     * If true, the hint text has been modified (in case of a #else or #elif directive for example)
     */
    public modified: boolean = false;

    /**
     * Creates a new instance of the Hint class.
     * @param DecoType The decoration type for the hint.
     * @param Range The range of the hint in the editor.
     */
    constructor(Text: string) {
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
            this.negated = false;
        } else {
            this.Text = '!' + this.Text;
            this.negated = true;
        }
    }
}