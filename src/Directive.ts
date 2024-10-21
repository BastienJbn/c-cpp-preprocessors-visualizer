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
     * @brief String containing the condition of the directive
     */
    public condition: string;

    /**
     * Dummy function. Overriden by derived class to dispose any private attribute.
     */
    public dispose(): void {}

    constructor(range: vscode.Range, condition: string) {
        this.range = range;
        this.condition = condition;
    }
}

/**
 * @brief Class representing a directive that should be displayed with a hint
 * @abstract
 */
export abstract class HintedDirective extends Directive {
    hint: Hint;
    constructor(directive: vscode.Range, paramStr: string, hint: Hint) {
        super(directive, paramStr);
        this.hint = hint;
    }
    
    public override dispose() {
        this.hint.decoType.dispose();
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
 * @brief Class representing a middle hinted directive
 */
export class MiddleHintedDirective extends HintedDirective {
    constructor(directive: vscode.Range, paramStr: string, hint: Hint) {
        super(directive, paramStr, hint);
    }
}

/**
 * @brief Class representing a middle directive
 */
export class MiddleDirective extends Directive {
    constructor(directive: vscode.Range, paramStr: string) {
        super(directive, paramStr);
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

// Define an enum to represent the different types of preprocessor directives
export enum DirectiveType {
    Opening,
    Middle,
    MiddleHinted,
    Closing,
}
