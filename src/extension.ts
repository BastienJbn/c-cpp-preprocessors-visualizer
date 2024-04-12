import * as vscode from 'vscode';
import { Parser } from "./Parser";

let parser: Parser;

export function activate(context: vscode.ExtensionContext) {
    console.log('[DEBUG]', 'Extension is active');
    parser = new Parser();
    parser.activate(context);
}

export function deactivate() {
    console.log('[DEBUG]', 'Extension is deactivated');
    parser.deactivate();
}
