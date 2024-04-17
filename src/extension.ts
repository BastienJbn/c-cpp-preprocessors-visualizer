import * as vscode from 'vscode';
import { Parser } from "./Parser";
import { log } from "./utils";

let parser: Parser;

export function activate(context: vscode.ExtensionContext) {
    log('Extension is active');
    parser = new Parser();
    parser.activate(context);
}

export function deactivate() {
    log('Extension is deactivated');
    parser.deactivate();
}
