import * as vscode from 'vscode';
import { Hint } from './Hint';

export class DirectiveGroup {
    /*** Attributes ***/
    
    /**
     * @brief Array of directives {@link vscode.Range} of the group
     */
    public directives: Array<vscode.Range>;

    /**
     * @brief Condition string
     * 
     * @details
     * String containing the condition of the directive group
     * Example : "#if defined(FOO) && defined(BAR)" -> "defined(FOO) && defined(BAR)"
     */
    public conditionStr: string;

    /**
     * @brief {@link Hint} array
     * 
     * @details
     * Array containing the hints of the directive group.
     * Each index correspond to a directive in the group.
     * Sorted in the same order as the directives array.
     * 
     * Hint string can differ from the condition string if the opening directive is negated
     * Example : "#ifndef FOO" -> condition = "FOO", hint = "!FOO"
     */
    public hintArr: Array<Hint>;

    /**
     * @brief Group level
     * 
     * @details
     * Nesting level of the directive group
     * Example : 
     * #if defined(FOO)     -> level 0
     * #if defined(BAR)   -> level 1
     * #endif
     * #endif
     */
    public level: number;

    /**
     * @brief Boolean indicating if the group is completed
     * 
     * @details
     * A group is completed if it has at least an opening and closing directive.
     * Always false when the group is created.
     */
    public completed: boolean = false;
    
    /**
     * @brief Creates a new instance of the DirectiveGroup class.
     * @param directives  Array of directives ranges of the group (@see {@link DirectiveGroup.directives})
     * @param conditionStr  String containing the condition of the directive group (@see {@link DirectiveGroup.conditionStr})
     * @param hintStr  String containing the hint of the directive group (@see {@link DirectiveGroup.hintStr})
     * @param level  Nesting level of the directive group. (see {@link DirectiveGroup.level})
     * 
     * @details
     * This constructor initializes all attributes of the class.
     * Attributes are set to default values if they are not provided.
     */
    constructor(
        directives: Array<vscode.Range> | undefined,
        conditionStr: string | undefined,
        hintArr: Array<Hint> | undefined,
        level: number | undefined,
    ) {
        // For each parameter, if it is undefined, we set it to a default value
        this.directives = directives ?? [];
        this.conditionStr = conditionStr ?? "";
        this.hintArr = hintArr ?? [];
        this.level = level ?? 0;
    }
}
