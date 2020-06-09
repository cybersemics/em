/**
 * @packageDocumentation
 * @module util.lower
 */

// @ts-nocheck

/** Guarded toLowercase. */
export const lower = x => x && x.toLowerCase ? x.toLowerCase() : x
