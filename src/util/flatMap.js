export const flatten = list => Array.prototype.concat.apply([], list)
export const flatMap = (list, f) => Array.prototype.concat.apply([], list.map(f))
