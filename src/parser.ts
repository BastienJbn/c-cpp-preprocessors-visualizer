import * as vscode from 'vscode';

import { log } from './Utils';
import { Hint } from './Hint';
import { DirectiveGroup } from './DirectiveGroup';
import { Directive, HintedDirective, OpeningDirective, MiddleDirective, MiddleHintedDirective, ClosingDirective, DirectiveType } from './Directive';

/**
 * @brief Parsing differences tuple
 * @details
 * 1- Old groups
 * 2- New groups
 */
export type ParseDiff = [DirectiveGroup[], DirectiveGroup[]];

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
     * @brief Update the document index data by comparing old and new parsing results.
     * @param document The document to parse and update.
     * @param signal An AbortSignal to handle cancellation.
     * @returns A ParseDiff tuple containing arrays of old groups to remove and new groups to display.
     * @todo Needs to be optimized
     */
    public async updateDocument(document: vscode.TextDocument, signal: AbortSignal): Promise<ParseDiff | undefined> {
        // Get previous data
        let previousData = this.dataMap.get(document);

        // Start new parsing operation
        const newData = await this.parseDocument(document, signal);

        if (newData === undefined) {
            return undefined;
        }

        // TODO Compute the difference between previous and new data
        // const diffResult = this.computeDifference(previousData, newData);

        // Store the new parsing result in the dataMap
        this.dataMap.set(document, newData);

        // return diffResult; // Return the computed difference as a ParseDiff tuple
        return [previousData ? previousData : [], newData];  // TODO Return real diff
    }

    public dispose() {
        // Foreach doc index in datamap
        for (const index of this.dataMap.values()) {
            index.forEach(group => {
                group.directives.forEach(d => {
                    d.dispose();
                });
            });
        }
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
            /^#else\s*$/,
        ],
        [DirectiveType.Closing]: [
            /^#endif\s*$/,
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
     * @brief Parse the given document and search for the directive groups
     * @param document The document to parse
     * @param signal An AbortSignal to handle cancellation.
     * @returns A Promise that resolves to an array of DirectiveGroup objects. Can be empty.
     */
    private async parseDocument(document: vscode.TextDocument, signal: AbortSignal): Promise<DirectiveGroup[] | undefined> {
        // Check if the operation has already been aborted
        if (signal.aborted) {
            return undefined;
        }
    
        // If the file is not C or C++, return an empty array
        if (!(document.languageId === 'c' || document.languageId === 'cpp' || document.languageId === 'h' || document.languageId === 'hpp')) {
            log('File is not a C or C++ file');
            return undefined;
        }
    
        // Array of groups to return
        let groups: DirectiveGroup[] = [];
        
        // Current nesting level
        let currLevel = 0;
    
        // Get the previous groups for the document (if any) to reuse IDs
        const previousGroups = this.dataMap.get(document) ?? [];
        
        // Create a map of previous groups by their opening directive's range
        const previousGroupsMap = new Map<string, DirectiveGroup>(
            previousGroups.map(group => [this.rangeToString(group.directives[0].range), group])
        );
        
        // Parse line by line
        for (let line = 0; line < document.lineCount; line++) {
            // Check if the operation has been aborted
            if (signal.aborted) {
                return undefined;
            }
    
            // Parse the line 
            const directive = this.parseLine(document.lineAt(line));
    
            // If there is no directive, continue to the next line
            if (directive === null) {
                continue;
            }
    
            // Opening directive found
            if (directive instanceof OpeningDirective) {
                const rangeString = this.rangeToString(directive.range);
                
                // Reuse the ID if the group with this opening directive existed before
                const previousGroup = previousGroupsMap.get(rangeString);
                const newGroup = new DirectiveGroup(
                                        [directive],
                                        currLevel + 1,
                                        previousGroup ? previousGroup.id : undefined
                                    );
    
                this.currGroups.push(newGroup);
                currLevel++;
            }
            // Middle directive found
            else if ((directive instanceof MiddleDirective) || (directive instanceof MiddleHintedDirective)) {
                try {
                    this.currGroups[currLevel - 1].directives.push(directive);
                } catch (e) {
                    continue;
                }
            }
            // Closing directive found
            else if (directive instanceof ClosingDirective) {
                try {
                    this.currGroups[currLevel - 1].directives.push(directive);
                } catch (e) {
                    continue;
                }
    
                // Add the group to the return array
                groups.push(this.currGroups.pop()!);
    
                // Update nesting level
                currLevel -= 1;
            }
        }
        
        // this.dataMap.set(document, groups);
    
        // Return the parsed directive groups
        return groups;
    }

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
    private getHintOfLastDirective(group: DirectiveGroup): string {
        try {
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
            return "";
        }
        catch(e) {
            return "";
        }
    }

    /**
     * @brief Compare two sets of data and return the difference.
     *        The difference consists of groups that are new or have been changed,
     *        and groups that should be removed from the display.
     * @param previousData The old parsing result.
     * @param newData The new parsing result.
     * @returns A ParseDiff where the first element is an array of old groups to remove,
     *          and the second element is an array of new groups to display.
     */
    private computeDifference(previousData: DirectiveGroup[] | undefined, newData: DirectiveGroup[]): ParseDiff {
        const oldGroupsToRemove: DirectiveGroup[] = [];
        const newGroupsToDisplay: DirectiveGroup[] = [];

        if (!previousData) {
            // If no previous data, all new groups should be displayed
            newGroupsToDisplay.push(...newData);
            return [oldGroupsToRemove, newGroupsToDisplay];
        }

        // Create a map for previous groups using their IDs for quick access
        const prevGroupsMap = new Map(previousData.map(group => [group.id, group]));

        // Find groups that are new or changed
        newData.forEach(group => {
            const previousGroup = prevGroupsMap.get(group.id);

            // Compare IDs and number of directives in group
            if (!previousGroup || previousGroup.id !== group.id || group.directives.length !== previousGroup.directives.length) {
                // New group found
                newGroupsToDisplay.push(group);
            }
            else{
                // Compare conditions of each directives in group
                for (let i = 0; i < group.directives.length; i++) {
                    if (group.directives[i].condition !== previousGroup.directives[i].condition) {
                        oldGroupsToRemove.push(previousGroup);
                        newGroupsToDisplay.push(group);
                    }
                }
            }
        });

        // Find groups that have been removed
        previousData.forEach(previousGroup => {
            // If group is not found in newData, it should be removed
            if (!newData.find(group => group.id === previousGroup.id)) {
                oldGroupsToRemove.push(previousGroup);
            }
        });

        return [oldGroupsToRemove, newGroupsToDisplay];
    }

    /**
     * @brief Compare two DirectiveGroup objects to determine if they are equal.
     * @param group1 The first DirectiveGroup.
     * @param group2 The second DirectiveGroup.
     * @returns Whether the two groups are equal.
     */
    private areGroupsEqual(group1: DirectiveGroup, group2: DirectiveGroup): boolean {
        // Compare IDs
        if (group1.id !== group2.id) {
            return false;
        }

        // Compare conditions of each directives in group
        for (let i = 0; i < group1.directives.length; i++) {
            if (group1.directives[i].condition !== group2.directives[i].condition) {
                return false;
            }
        }

        return true; // If all checks pass, the groups are considered equal
    }

    private rangeToString(range: vscode.Range) : string {
        return range.start.line.toString() + ":" + range.start.character + ":" + range.end.character;
    }
}
