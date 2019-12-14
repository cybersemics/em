/** Returns a shallow copy of an object with all keys that do not have a value of null or undefined */
export const notNull = o => {
  const output = {}
  Object.keys(o).forEach(key => {
    if (o[key] != null) {
      output[key] = o[key]
    }
  })
  return output
}
