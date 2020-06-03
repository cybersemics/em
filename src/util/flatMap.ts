// @ts-nocheck

/**
 *
 */
export const flatMap = (list, f) => Array.prototype.concat.apply([], list.map(f))
