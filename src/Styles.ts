import * as vscode from 'vscode';

/**
 * @brief The decoration type for the outlines
 * @details This attribute is used to keep track of the decoration type for the outlines.
 * @see {@link vscode.TextEditorDecorationType}
 */
export let outlineDecoType: vscode.TextEditorDecorationType = 
vscode.window.createTextEditorDecorationType({
    border: '1px solid grey',  //Outline
    overviewRulerLane: vscode.OverviewRulerLane.Center,  //Show in the overview ruler
    overviewRulerColor: '#929292',  //Color
});

/**
 * @brief The decoration type for the scrollbar
 * @details This attribute is used to keep track of the decoration type for the scrollbar.
 * @see {@link vscode.TextEditorDecorationType}
 * @readonly
 */
export let scrollbarDecoType: vscode.TextEditorDecorationType =
vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    overviewRulerColor: 'grey',
});

// TODO make styles configurable