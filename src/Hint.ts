import * as vscode from 'vscode';

/**
 * Represents a hint in the editor.
 */
export class Hint {
    /**
     * @brief Decoration type of the hint
     */
    public decoType: vscode.TextEditorDecorationType;

    /**
     * @brief Range of the hint in the editor
     */
    public range: vscode.Range;

    /**
     * @brief Text of the hint
     */
    public text: string;

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
     * @param Text The text of the hint
     * @param Range The range of the hint in the editor.
     */
    constructor(Text: string, Range: vscode.Range) {
        this.text = Text;
        this.range = Range;
        this.decoType = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: ' ' + this.text,
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
        // Negate the hint text
        if (this.text[0] === '!') {
            this.text = this.text.slice(1);
            this.negated = false;
        } else {
            this.text = '!' + this.text;
            this.negated = true;
        }

        // Update the decoration type
        this.decoType = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: ' ' + this.text,
                color: 'grey',
                fontStyle: 'italic',
            },
        });
    }
}
