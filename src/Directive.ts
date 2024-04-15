import * as vscode from 'vscode';
import { Hint } from './Hint';

export class Directive {
    /*** Attributes ***/

    /**
     * @brief Range of the directive
     */
    public range: vscode.Range;

    /**
     * @brief String containing the parameters of the directive
     */
    public paramStr: string;

    /**
     * @brief String containing the hint of the directive
     */
    public hint: Hint;

    constructor(directive: vscode.Range, paramStr: string, hint: Hint) {
        this.range = directive;
        this.paramStr = paramStr;
        this.hint = hint;
    }
}
