/**
 * Concatenates a single value to the end of an array. Faster than Array.prototype.concat.
 * See: https://jsperf.com/concat-vs-spread3 .
 */
const concatOne = <T>(arr: T[], x: T): T[] => [...arr, x]

export default concatOne
