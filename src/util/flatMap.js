/** Flattens an array and maps the given function over each item. */
export const flatMap = (list, f) => Array.prototype.concat.apply([], list.map(f))
