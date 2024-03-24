import * as vscode from 'vscode';
import { extensionId } from './misc';

export class Configuration implements vscode.WorkspaceConfiguration {
    readonly [key: string]: any;
    private workspaceConfig: vscode.WorkspaceConfiguration;

    constructor() {
        this.workspaceConfig = vscode.workspace.getConfiguration(extensionId);
    }

    get<T>(section: string, defaultValue?: T): T | undefined {
        return this.workspaceConfig.get(section, defaultValue);
    }

    has(section: string): boolean {
        return this.workspaceConfig.has(section);
    }

    inspect<T>(section: string): { key: string; defaultValue?: T | undefined; globalValue?: T | undefined; workspaceValue?: T | undefined; workspaceFolderValue?: T | undefined; defaultLanguageValue?: T | undefined; globalLanguageValue?: T | undefined; workspaceLanguageValue?: T | undefined; workspaceFolderLanguageValue?: T | undefined; languageIds?: string[] | undefined; } | undefined {
        return this.workspaceConfig.inspect(section);
    }

    update(section: string, value: any, configurationTarget?: boolean | vscode.ConfigurationTarget | null | undefined, overrideInLanguage?: boolean | undefined): Thenable<void> {
        return this.workspaceConfig.update(section, value, configurationTarget, overrideInLanguage);
    }

    toString(): string {
        return this.workspaceConfig.toString();
    }
}

export let cfg : Configuration = new Configuration();