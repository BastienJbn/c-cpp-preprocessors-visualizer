import * as vscode from 'vscode';
import { Extension } from './Extension';

const extension = new Extension();

export function activate(context: vscode.ExtensionContext) {
    extension.activate(context);
}

export function deactivate() {
    extension.deactivate();
}
