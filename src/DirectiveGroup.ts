import * as vscode from 'vscode';
import { Directive } from './Directive';


export class DirectiveGroup {
    /*** Attributes ***/
    
    /**
     * @brief Array of {@link Directive}
     */
    public directives: Array<Directive> = [];

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
    public level: number = 0;

    /**
     * @brief Boolean indicating if the group is completed
     * 
     * @details
     * A group is completed if it has at least an opening and closing directive.
     * Always false when the group is created.
     * 
     * TODO: Currently not used, should be used to check if the group is valid.
     */
    public completed: boolean = false;
    
    /**
     * @brief Creates a new instance of the DirectiveGroup class.
     * @param directives Array of {@link Directive} of the group. (see {@link DirectiveGroup.directives})
     * @param level  Nesting level of the directive group. (see {@link DirectiveGroup.level})
     * 
     * @details
     * This constructor initializes all attributes of the class.
     * Attributes are set to default values if they are not provided.
     */
    constructor(
        directives: Array<Directive> | undefined,
        level: number | undefined,
    ) {
        // For each parameter, if it is undefined, we set it to a default value
        this.directives = directives ?? [];
        this.level = level ?? 0;
    }
}
