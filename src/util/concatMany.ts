/**
 * Concatenates multiple values to the end of an array. Faster than Array.prototype.concat.
 * See: https://jsperf.com/concat-vs-spread3
 */
export const concatMany = (arr: [], x: []) => [...arr, ...x]
