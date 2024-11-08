/** Returns a function that calls the given function once then returns the same result forever. Simpler type and implementation than the 'once' npm package. */
const once = <A, R>(f: (...args: A[]) => R): typeof f => {
  const symbol = Symbol('once-result')
  let result: R | symbol = symbol
  return (...args: A[]) => {
    if (result !== symbol) return result as R
    result = f(...args)
    return result
  }
}

export default once
