/**
 * Concatenates multiple values to the end of an array. Faster than Array.prototype.concat.
 * See: https://jsperf.com/concat-vs-spread3 .
 */
const concatMany = <T>(arr: T[], x: T[]): T[] => [...arr, ...x]

export default concatMany
