// Purpose: Contains miscellaneous functions and variables that are used throughout the extension.

import { EventEmitter } from 'events';

/**
 * @brief String containing the extension's ID.
 */
export const extensionId = 'c-cpp-preprocessors-visualizer';

export function log(message: string, ...optionalParams: any[]) {
    console.log(`[${extensionId}] `, message, ...optionalParams);
}
