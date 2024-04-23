import * as vscode from 'vscode';
import { Hint } from './Hint';

/**
 * @brief Class representing a directive
 * @abstract
 */
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
 * @brief Class representing a directive with a hint
 * @abstract
 */
export abstract class HintedDirective extends Directive {
    hint: Hint;
    constructor(directive: vscode.Range, paramStr: string, hint: Hint) {
        super(directive, paramStr);
        this.hint = hint;
    }
}

/**
 * @brief Class representing an opening directive
 */
export class OpeningDirective extends Directive {
    constructor(directive: vscode.Range, paramStr: string) {
        super(directive, paramStr);
    }
}

/**
 * @brief Class representing a middle directive
 */
export class MiddleDirective extends HintedDirective {
    constructor(directive: vscode.Range, paramStr: string, hint: Hint) {
        super(directive, paramStr, hint);
    }
}

/**
 * @brief Class representing a closing directive
 */
export class ClosingDirective extends HintedDirective {
    constructor(directive: vscode.Range, paramStr: string, hint: Hint) {
        super(directive, paramStr, hint);
    }
}
