/**
 * @brief List of opening preprocessor directives
 */
export const openingKeywords = [
    '#if',
    '#ifdef',
    '#if defined',
    '#ifndef',
    '#if !defined',
    '#ifeq',
    '#ifneq'
];

/**
 * @brief List of middle preprocessor directives
 */
export const middleKeywords = [
    '#elif',
    '#else'
];

/**
 * @brief List of closing preprocessor directives
 */
export const closingKeywords = [
    '#endif'
];

/**
 * @brief List of all preprocessor directives
 */
export const allKeywords = openingKeywords.concat(middleKeywords, closingKeywords);