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

// assert.deepEqual(

//   reduceObj({ a: 1, b: 2, c: 3 }, (key, val) => ({
//     [key + key] : val * val
//   })),

//   {
//     aa: 1,
//     bb: 4,
//     cc: 9
//   }

// )

// assert.deepEqual(

//   reduceObj({ a: 1, b: 2, c: 3 }, (key, val) => ({
//     [key + 'x'] : val + 1,
//     [key + 'y'] : val * 2,
//   })),

//   {
//     ax: 2,
//     ay: 2,
//     bx: 3,
//     by: 4,
//     cx: 4,
//     cy: 6
//   }

// )
