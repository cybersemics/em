/** Returns a shallow copy of an object with all keys that do not have a falsey value */
export const notFalse = o => {
  const output = {}
  Object.keys(o).forEach(key => {
    if (o[key]) {
      output[key] = o[key]
    }
  })
  return output
}
