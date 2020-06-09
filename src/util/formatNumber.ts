/**
 * @packageDocumentation
 * @module util.formatNumber
 */

/** Adds commas to a number. */
// TODO: Localize
export const formatNumber = (n: number, locale = 'en-US') => n.toLocaleString(locale)
