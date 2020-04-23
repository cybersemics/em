/** Reduces an object to another object constructed from all the key-value pairs that the reducer f returns.
 * @param obj    An object.
 * @param f      (key, value) => { ... }
*/
export const reduceObj = (obj, f) =>
  Object.keys(obj).reduce((accum, key) => {
    const o = f(key, obj[key], accum)
    const insideObj = Object.keys(o).reduce((oaccum, okey) => ({
      ...oaccum,
      [okey]: o[okey]
    }), {})

    return {
      ...accum,
      ...insideObj
    }
  }, {})
