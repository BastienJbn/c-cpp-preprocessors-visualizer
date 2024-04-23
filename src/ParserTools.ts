import * as vscode from 'vscode';
import * as dico from './Dictionnary';

/**
 * @brief Parse the given line and search for the given keyword(s) (matching the whole word)
 * 
 * @param line The line to parse
 * @param keyword The keyword(s) to search for
 * @returns The range of the keyword if found, undefined otherwise
 */
export function getKeywordRange(line: vscode.TextLine, keyword: string | string[]): vscode.Range | undefined {
    let ret: vscode.Range | undefined = undefined;

    // Ensure keyword is an array
    const keywords = Array.isArray(keyword) ? keyword : [keyword];
    
    // Parse the directive
    const directive = line.text.trim().split(' ')[0];

    let i = 0;
    let kw = keywords[i];
    while (!ret && i < keywords.length) {
        if (directive === kw) {
            ret = new vscode.Range(
                line.lineNumber, line.firstNonWhitespaceCharacterIndex,
                line.lineNumber, line.firstNonWhitespaceCharacterIndex + kw.length
            );
        }
        i++;
        kw = keywords[i];
    }

    return ret;
}

/**
 * @brief Parse the text after the directive keyword
 * @param line The line to parse
 * @returns The condition string
 */
export function getConditionText(line: vscode.TextLine): string {
    const words = line.text.trim().split(' ');
    if (words.length > 1) {
        return words.slice(1).join(' ');
    }
    return '';
}

//###################//
// String extensions //
//###################//

// Extend the String prototype to add startsWithOpeningKeyword
declare global {
    interface String {
        startsWithOpeningKeyword(): boolean;
        startsWithClosingKeyword(): boolean;
        startsWithMiddleKeyword(): boolean;
    }
}

/**
 * @brief Check if the string starts with an opening preprocessor directive
 * 
 * @returns True if the string starts with an opening preprocessor directive, false otherwise
 */
String.prototype.startsWithOpeningKeyword = function() {
    return dico.openingKeywords.some(keyword => this.trim().startsWith(keyword));
};

/**
 * @brief Check if the string starts with a closing preprocessor directive
 * 
 * @returns The keyword if the string starts with a closing preprocessor directive, false otherwise
 */
String.prototype.startsWithClosingKeyword = function() {
    return dico.closingKeywords.some(keyword => this.trim().startsWith(keyword));
};

/**
 * @brief Check if the string starts with a middle preprocessor directive
 * 
 * @returns The keyword if the string starts with a middle preprocessor directive, false otherwise
 */
String.prototype.startsWithMiddleKeyword = function() {
    return dico.middleKeywords.some(keyword => this.trim().startsWith(keyword));
};
