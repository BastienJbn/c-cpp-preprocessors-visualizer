import * as vscode from 'vscode';
import { Hint } from './Hint';
import { openingKeywords, middleKeywords, closingKeywords } from './dico';

export abstract class Directive {
    /**
     * @brief Range of the directive
     */
    public range: vscode.Range;

    /**
     * @brief String containing the parameters of the directive
     */
    public paramStr: string;

    constructor(directive: vscode.Range, paramStr: string) {
        this.range = directive;
        this.paramStr = paramStr;
    }
}

/**
 * @brief Interface for directives that contain a hint
 */
export abstract class HintedDirective extends Directive {
    hint: Hint;
    constructor(directive: vscode.Range, paramStr: string, hint: Hint) {
        super(directive, paramStr);
        this.hint = hint;
    }
}

export class OpeningDirective extends Directive {
    constructor(directive: vscode.Range, paramStr: string) {
        super(directive, paramStr);
    }
}

export class MiddleDirective extends HintedDirective {
    constructor(directive: vscode.Range, paramStr: string, hint: Hint) {
        super(directive, paramStr, hint);
    }
}

export class ClosingDirective extends HintedDirective {
    constructor(directive: vscode.Range, paramStr: string, hint: Hint) {
        super(directive, paramStr, hint);
    }
}
