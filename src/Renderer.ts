/**
 * Renderer class.
 * Handle rendering operations. Takes data as input ({@link DirectiveGroup}).
 */
import * as vscode from 'vscode';
import { DirectiveGroup } from "./DirectiveGroup";
import * as styles from './Styles';
import { HintedDirective } from './Directive';

export class Renderer {
    /**
     * @brief Display or Update the outlines (if any)
     * @param editor The text editor to highlight the pair in
     * @details 
     * Get the group of directives under cursor and apply the outline decoration.
     * If there is a selection, remove the outlines.
     */
    public displayOutlines(editor: vscode.TextEditor, dataIndex: DirectiveGroup[] | undefined) {
        // If the extension or the feature are disabled, do nothing
        if (!this.enable || !this.enableOutlines) {
            return;
        }

        // Language should be C or C++
        const languageId = editor.document.languageId;
        if ( !(languageId === 'c' || languageId === 'cpp' || languageId === 'h' || languageId === 'hpp') ) {
            return;
        }

        // Should not outline when there is a selection
        const selection = editor.selection;
        if (!selection.start.isEqual(selection.end)) {
            editor.setDecorations(styles.outlineDecoType, []); // Remove the outlines
            return;
        }

        // Get cursor position
        const position = editor.selection.active;
        
        // If dataIndex is empty, nothing to do
        if (!dataIndex) {
            return;
        }

        const group = dataIndex.find(
            g => g.directives.some(
                r => r.range.start.line <= position.line && r.range.end.line >= position.line
            )
        );

        // Get the range to outline
        let keywordRanges: vscode.Range[] = [];
        if (group) {
            keywordRanges = group.directives.map(d => d.range);
        }
        
        // Set the decorations to detected ranges, or remove them if none 
        editor.setDecorations(styles.outlineDecoType, keywordRanges);
        editor.setDecorations(styles.scrollbarDecoType, keywordRanges);
    }

    /**
     * @brief Remove all the outline decorations from the current editor
     */
    public removeOutlines(editor: vscode.TextEditor) {
        editor.setDecorations(styles.outlineDecoType, []);
        editor.setDecorations(styles.scrollbarDecoType, []);
    }
    
    /**
     * @brief Display the hints in the editor
     * @param editor Single or Array of {@link vscode.TextEditor} to display the hints in
     */
    public displayHints(editor: vscode.TextEditor | vscode.TextEditor[], dataIndex: DirectiveGroup[] | undefined) {
        // Check Config
        if (!this.enable || !this.enableHints) {
            return;
        }

        // Ensure we always work with an array
        const editors = Array.isArray(editor) ? editor : [editor];

        // Display the hints in the given editors
        editors.forEach(e => {
            const doc = e.document;

            const groups = dataIndex;
            if (!groups) {
                return;
            }

            groups.forEach(g => {
                g.directives.forEach(d => {
                    // Display the hint for middle and closing directives
                    if (d instanceof HintedDirective) {
                        e.setDecorations(d.hint.decoType, [d.hint.range]);
                    }
                });
            });
        });
    }

    /**
     * @brief Remove all the hint decorations from the given editor(s)
     */
    public removeHints(editor: vscode.TextEditor, groups: DirectiveGroup[]) {
        groups.forEach(g => {
            g.directives.forEach(d => {
                // Remove the hint for middle and closing directives
                if (d instanceof HintedDirective) {
                    editor.setDecorations(d.hint.decoType, []);
                }
            });
        });
    }

    public enable: boolean = true;
    public enableOutlines: boolean = true;
    public enableHints: boolean = true;
}
