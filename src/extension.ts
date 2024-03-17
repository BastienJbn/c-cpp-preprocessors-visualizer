import * as vscode from 'vscode';
import { outlinePairUnderCursor, parserActivate, parserDeactivate } from "./parser";

export function activate(context: vscode.ExtensionContext) {
    console.log('[DEBUG]', 'Extension is active');
    
    parserActivate(context);
}

export function deactivate() {
    console.log('[DEBUG]', 'Extension is deactivated');
    parserDeactivate();
    return;
}
