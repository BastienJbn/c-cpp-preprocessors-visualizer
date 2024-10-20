import * as vscode from 'vscode';
import { Directive } from './Directive';


export class DirectiveGroup {
    /*** Attributes ***/
    
    /**
     * @brief Unique identifier for the group
     */
    public id: string;
    
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

    /** Static counter to help generate unique IDs */
    private static idCounter = 0;
    
    /**
     * @brief Creates a new instance of the DirectiveGroup class with a new ID.
     * @param directives Array of {@link Directive} of the group.
     * @param level  Nesting level of the directive group.
     * 
     * @details
     * This constructor initializes all attributes of the class.
     * Attributes are set to default values if they are not provided.
     */
    constructor(
        directives: Directive[] | undefined,
        level: number | undefined,
        id: string | undefined,
    ) {
        this.id = id ?? this.generateId();  // Generate a unique ID for each group
        this.directives = directives ?? [];
        this.level = level ?? 0;
    }

    /**
     * @brief Generates a unique ID for each DirectiveGroup instance
     */
    private generateId(): string {
        // Use a combination of timestamp and counter for uniqueness
        return `${Date.now()}-${DirectiveGroup.idCounter++}`;
    }
}
