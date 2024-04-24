import * as vscode from 'vscode';

import { log } from './utils';
import { Hint } from './Hint';
import { DirectiveGroup } from './DirectiveGroup';
import { Directive, HintedDirective, OpeningDirective, MiddleDirective, ClosingDirective } from './Directive';
import * as tools from './ParserTools';
import * as dico from './Dictionnary';

export class Parser {
    //##############//
    // Public Scope //
    //##############//

    constructor() {
        // Initialize attributes
        this.dataMap = new Map();
    }

    /**
     * @brief Get the directive groups of the given document
     * @param document The document to get the groups from
     * @returns An array of {@link DirectiveGroup} objects, or undefined
     */
    public get(document: vscode.TextDocument): DirectiveGroup[] | undefined {
        return this.dataMap.get(document);
    }

    /**
     * @brief Update the directive groups of the given document
     * @param document  The document to update
     * @returns  An array of {@link DirectiveGroup} objects
     */
    public update(document: vscode.TextDocument): DirectiveGroup[] {
        const groups = this.parse(document);
        this.dataMap.set(document, groups);
        return groups;
    }

    /**
     * @brief Modify data according to the given event
     * @param document The document to modify
     * @param event The event that triggered the modification
     */
    public modify(document: vscode.TextDocument, event : readonly vscode.TextDocumentContentChangeEvent[]) {
        // TODO : Implement this method
    }

    //#################//
    // Private Scope   //
    //#################//

    /*** Attributes ***/

    /**
     * @brief A map where each key is a vscode.TextDocument and each value is a DirectiveGroup Array.
     * @type {Map<vscode.TextDocument, DirectiveGroup[]>}
     * @see {@link DirectiveGroup}
     * 
     * @details 
     * This map keeps track of the directive groups for each visible text editor. 
     * It is used to store all directives of a file, in their corresponding group.
     */
    private dataMap: Map<vscode.TextDocument, DirectiveGroup[]>;
    
    /*** Methods ***/

    /**
     * @brief Parse the given document and search for the directive groups
     * @param document The document to parse
     * @returns An array of DirectiveGroup objects. Can be empty.
     */
    private parse(document: vscode.TextDocument): DirectiveGroup[] {
        // If file is not C or C++, return undefined
        if (!(document.languageId === 'c' || document.languageId === 'cpp' || document.languageId === 'h' || document.languageId === 'hpp')) {
            throw new Error('File is not a C or C++ file');
        }
    
        // Array of groups to return
        let groups: DirectiveGroup[] = [];
    
        // Current nesting level
        let currLevel = 0;
    
        // Lifo of current groups (index correspond to a relative nesting level)
        let currGroups: DirectiveGroup[] = [new DirectiveGroup(undefined, 0)];
    
        // Parse line by line
        for (let line = 0; line < document.lineCount; line++) {
            // Parse the line 
            const directive = this.parseLine(document.lineAt(line), currGroups[currLevel]);
    
            // If there is no directive, continue to the next line
            if (!directive) {
                continue;
            }
    
            // Opening directive found
            if (directive instanceof OpeningDirective) {
                // Create a new group
                const newGroup = new DirectiveGroup([directive], currLevel + 1);
                currGroups.push(newGroup);
                currLevel++;
            }
            // Middle directive found
            else if (directive instanceof MiddleDirective) {
                // Add the directive to the current group
                currGroups[currLevel].directives.push(directive);
            }
            // Closing directive found
            else if (directive instanceof ClosingDirective) {
                // Add the directive to the current group
                currGroups[currLevel].directives.push(directive);
    
                // Add the group to the return array
                groups.push(currGroups.pop()!);
    
                // Update nesting level
                currLevel -= 1;
            }
        }
        return groups;
    }

    /**
     * @brief Parse the line and return the corresponding directive
     * @param line  The line to parse
     * @param group  The group to which the directive belongs
     * @returns  The nesting level update (can be negative), or undefined if the directive is not valid
     */
    private parseLine(line: vscode.TextLine, group: DirectiveGroup | undefined) : Directive | undefined {
        let ret: Directive | undefined = undefined;
        
        const text = line.text.trim();
            
        // Opening keyword detected
        if (text.startsWithOpeningKeyword()) {
            // Find the range of the keyword in line
            const directiveRg = tools.getKeywordRange(line, dico.openingKeywords);
            if(!directiveRg) {
                log('Error: Opening keyword not found in line', line);
                return undefined;
            }

            // Find the param string
            let paramStr = tools.getConditionText(line);
            if (text.startsWith('#ifndef') || text.startsWith('#ifneq')) {
                paramStr = '!' + paramStr;
            }
            
            // Create the Directive object
            ret = new OpeningDirective(directiveRg, paramStr);
        }

        // Middle keyword detected
        else if (text.startsWithMiddleKeyword()) {
            if (group !== undefined && group.directives.length > 0) {
                // Find the directive range
                const directiveRg = tools.getKeywordRange(line, dico.middleKeywords);
                if(!directiveRg) {
                    log('Error: Middle keyword not found in line', line);
                    return undefined;
                }

                // Find the param string
                const paramStr = tools.getConditionText(line);

                // Find the hint and its range
                const hintRg = new vscode.Range(line.lineNumber, directiveRg.end.character, line.lineNumber, line.range.end.character);
                let hint = new Hint("", hintRg);
                if (text.startsWith('#else')) {
                    // Hint str is the negation of the last directive hint
                    hint.text = this.getHintOfLastDirective(group)!;
                    hint.NegateString();
                }
                else if (text.startsWith('#elif')) {
                    // Hint text is the new condition
                    hint.text = tools.getConditionText(line);
                    hint.modified = true;
                }

                // Create the Directive object
                ret = new MiddleDirective(directiveRg, paramStr, hint);
            }
            else {
                // TODO: Indicate bad syntax with squiggly underline
            }
        }

        // Closing keyword detected
        else if (text.startsWithClosingKeyword()) {
            if (group !== undefined && group.directives.length > 0) {
                // Find the directive range
                const directiveRg = tools.getKeywordRange(line, dico.closingKeywords);
                if(!directiveRg) {
                    log('Error: Closing keyword not found in line', line);
                    return undefined;
                }

                // Find the param string
                const paramStr = tools.getConditionText(line);

                // Find the hint. Text is equal to the last directive hint
                const hintRg = new vscode.Range(line.lineNumber, directiveRg.end.character, line.lineNumber, line.range.end.character);
                const hintStr = this.getHintOfLastDirective(group)!;
                const hint = new Hint(hintStr, hintRg);

                // Create the Directive object
                ret = new ClosingDirective(directiveRg, paramStr, hint);
            }
            else {
                // TODO: Indicate bad syntax with squiggly underline
            }
        }

        return ret;
    }
    
    /**
     * @brief Add a directive to a group at a given position
     * @param directive  The directive to add
     * @param group  The group to add the directive to
     * @param position  The position to add the directive at (optional)
     */
    private addDirectiveToGroup(directive: Directive, group: DirectiveGroup, position?: number) {
        // If position is not defined, add the directive at the end of the group
        if (position === undefined) {
            position = group.directives.length;
        }

        // Check for impossible positions
        if (directive instanceof OpeningDirective && position > 0) {
            log('Error: Cannot add an opening directive in the middle of a group');
            return;
        }
        if (directive instanceof ClosingDirective && position < group.directives.length) {
            log('Error: Cannot add a closing directive in the middle of a group');
            return;
        }
        if (directive instanceof MiddleDirective && position === 0) {
            log('Error: Cannot add a middle directive at the beginning of a group');
            return;
        }

        // Add the directive to the group at the given position
        group.directives.splice(position, 0, directive);

        // TODO: Update all the hints below the added directive
    }

    /**
     * @brief Get the directive at the given position
     * @param doc The text document to search in
     * @param position The position to search from
     * @returns A {@link DirectiveGroup}, or undefined if not found
     */
    private getDirectiveFromPosition(doc: vscode.TextDocument, position: vscode.Position): Directive | undefined {
        const groups = this.dataMap.get(doc);
        if (!groups) {
            return undefined;
        }
        return this.getGroupFromPosition(doc, position)?.directives.find(
            d => d.range.start.line <= position.line && d.range.end.line >= position.line
        );
    }

    /**
     * @brief Get the group that encapsulate the position
     * @param doc The text editor to search in
     * @param position The position to search from
     * @returns A {@link DirectiveGroup}, or undefined if not found
     */
    private getGroupFromPosition(doc: vscode.TextDocument, position: vscode.Position): DirectiveGroup | undefined {
        let ret: DirectiveGroup | undefined = undefined;
        
        const groups = this.dataMap.get(doc);
        if (!groups) {
            return undefined;
        }
        
        // Find groups that contains the position
        const containingGroups = groups.filter(g => {
                // Check if the position is between the first and last directive of the group
                if (g.directives[0].range.start.line <= position.line && g.directives[g.directives.length - 1].range.end.line >= position.line) {
                    return true;
                }
                else {
                    return false;
                }
            }
        );

        // Return the group with the highest nesting level
        if (containingGroups.length > 0) {
            ret = containingGroups.reduce((prev, curr) => prev.level > curr.level ? prev : curr);
        }

        return ret;
    }

    /**
     * @brief Get the hint of the last directive in the group
     * @param group The group to search in
     * @returns The hint text of the last directive, or undefined if the group is empty
     */
    private getHintOfLastDirective(group: DirectiveGroup): string | undefined {
        if (group.directives.length > 0) {
            const lastDirective = group.directives[group.directives.length - 1];
            
            // Handle the case where the last directive is a middle or closing directive
            if (lastDirective instanceof HintedDirective) {
                return lastDirective.hint.text;
            }
            // Handle the case where the last directive is an opening directive
            else if (lastDirective instanceof Directive) {
                return lastDirective.paramStr;
            }
        }
        return undefined;
    }

}
