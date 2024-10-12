import * as vscode from 'vscode';

import { log } from './Utils';
import { Hint } from './Hint';
import { DirectiveGroup } from './DirectiveGroup';
import { Directive, HintedDirective, OpeningDirective, MiddleDirective, MiddleHintedDirective, ClosingDirective, DirectiveType } from './Directive';

export class Parser {
    //##############//
    // Public Scope //
    //##############//

    /**
     * @brief Get the directive groups of the given document
     * @param document The document to get the groups from
     * @returns An array of {@link DirectiveGroup} objects, or undefined
     */
    public get(document: vscode.TextDocument): DirectiveGroup[] | undefined {
        return this.dataMap.get(document);
    }

    /**
     * @brief Parse the given document and search for the directive groups
     * @param document The document to parse
     * @returns An array of DirectiveGroup objects. Can be empty.
     */
    public async parseDocument(document: vscode.TextDocument) {
        // If file is not C or C++, return undefined
        if (!(document.languageId === 'c' || document.languageId === 'cpp' || document.languageId === 'h' || document.languageId === 'hpp')) {
            log('File is not a C or C++ file');
        }

        // Array of groups to return
        let groups: DirectiveGroup[] = [];
    
        // Current nesting level
        let currLevel = 0;
    
        // Parse line by line
        for (let line = 0; line < document.lineCount; line++) {
            // Parse the line 
            const directive = this.parseLine(document.lineAt(line));
    
            // If there is no directive, continue to the next line
            if (directive === null) {
                continue;
            }

            // Opening directive found
            if (directive instanceof OpeningDirective) {
                // Create a new group
                const newGroup = new DirectiveGroup([directive], currLevel + 1);
                this.currGroups.push(newGroup);
                currLevel++;
            }
            // Middle directive found
            else if (directive instanceof MiddleDirective) {
                // Add the directive to the current group
                this.currGroups[currLevel-1].directives.push(directive);
            }
            // Closing directive found
            else if (directive instanceof ClosingDirective) {
                // Add the directive to the current group
                this.currGroups[currLevel-1].directives.push(directive);
    
                // Add the group to the return array
                groups.push(this.currGroups.pop()!);
    
                // Update nesting level
                currLevel -= 1;
            }
        }
        
        this.dataMap.set(document, groups);
    }

    /**
     * @brief Update data according to the given event
     * @param document The document to modify
     * @param event The event that triggered the modification
     */
    public async updateDocument(document: vscode.TextDocument, event : readonly vscode.TextDocumentContentChangeEvent[]) {
        this.parseDocument(document);
        
        // TODO : Optimize this function to only parse changed section
    }

    //#################//
    // Private Scope   //
    //#################//

    /*** Attributes ***/
    /**
     * @brief Map of preprocessor directives and corresponding regex
     * @note Order of declaration is important here. The first in the array is the first to be tested.
     *       Expressions encapsulated in others should be placed after.
     */
    private directivePatterns: { [key in DirectiveType]: RegExp[] } = {
        [DirectiveType.Opening]: [
            // /^#define\s+/,
            /^#ifdef\s+/,
            /^#ifndef\s+/,
            /^#ifneq\s+/,
            /^#ifeq\s+/,
            /^#if\s+/,
        ],
        [DirectiveType.Middle]: [
            /^#elif\s+/,
        ],
        [DirectiveType.MiddleHinted] : [
            /^#else/,
        ],
        [DirectiveType.Closing]: [
            /^#endif/,
        ],
    };

    /**
     * @brief A map where each key is a vscode.TextDocument and each value is a {@link DirectiveGroup} Array.
     * 
     * @details 
     * This map keeps track of the directive groups for each visible text editor. 
     * It is used to store all directives of a file, in their corresponding group.
     */
    private dataMap: Map<vscode.TextDocument, DirectiveGroup[]> = new Map();

    /**
     * @brief Array of currently building {@link DirectiveGroup}
     */
    private currGroups: DirectiveGroup[] = [];
    
    /*** Methods ***/

    /**
     * @brief Parse the line and return the corresponding directive
     * @param line  The line to parse
     * @returns  The nesting level update (can be negative), or undefined if the directive is not valid
     */
    private parseLine(line: vscode.TextLine): Directive | null {
        const text = line.text;

        // Loop through all knowed types of directive
        for (const type in DirectiveType) {
            const typeAsNumber = Number(type) as DirectiveType;
            const patterns : RegExp[] = this.directivePatterns[typeAsNumber];

            // Check if patterns is found
            if(!Array.isArray(patterns)) {
                continue;
            }

            // For each possible regex pattern
            for (const pattern of patterns) {
                // Try to find the pattern in the string
                const match = text.trim().match(pattern);

                // if pattern does not match, continue
                if (!match) {
                    continue;
                }

                // Parse directive range
                const directiveStart = text.indexOf('#');
                const directiveEnd = directiveStart + match[0].trim().length;  // Exclude leading spaces
                const dRange = new vscode.Range(
                    new vscode.Position(line.lineNumber, directiveStart),
                    new vscode.Position(line.lineNumber, directiveEnd)
                );
                const condition = this.getCondition(line);

                // Hint parameters
                let hintStr = "";
                const hRange = new vscode.Range(line.lineNumber, dRange.end.character, line.lineNumber, line.range.end.character);

                // Get the group in building process (last group in the array)
                let currGroup : DirectiveGroup = this.currGroups[this.currGroups.length-1];

                // Return an instance of the appropriate directive subclass
                switch (typeAsNumber) {
                    case DirectiveType.Opening:
                        return new OpeningDirective(dRange, condition);

                    case DirectiveType.Middle:
                        return new MiddleDirective(dRange, condition);

                    case DirectiveType.MiddleHinted:
                        const hintMiddle = new Hint(this.getHintOfLastDirective(currGroup)!, hRange);
                        hintMiddle.NegateString();
                        return new MiddleHintedDirective(dRange, condition, hintMiddle);

                    case DirectiveType.Closing:
                        hintStr = this.getHintOfLastDirective(currGroup)!;
                        const hintClosing = new Hint(hintStr, hRange);
                        return new ClosingDirective(dRange, condition, hintClosing);
                }
            }
        }
        return null;  // Return null if no directive was matched
    }

    /**
     * @brief Parse the text after the directive keyword
     * @param line The line to parse
     * @returns The condition string
     */
    private getCondition(line: vscode.TextLine): string {
        // 
        const words = line.text.trim().split(' ');
        if (words.length > 1) {
            return words.slice(1).join(' ').trim();
        }
        return '';
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
                return lastDirective.condition;
            }
        }
        return undefined;
    }
    
    /**
     * @brief Insert a directive to an existing group at a given position
     * @param directive  The directive to add
     * @param group  The group to add the directive to
     * @param position  The position to add the directive at (optional)
     */
    private insertDirectiveToGroup(directive: Directive, group: DirectiveGroup, position?: number) {
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
}
