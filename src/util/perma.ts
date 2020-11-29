/** Returns a function that calls the given function once then returns the same result forever. */
export const perma = <A, R>(f: (...args: A[]) => R): typeof f => {
  const symbol = Symbol('perma-result')
  let result: R | symbol = symbol // eslint-disable-line fp/no-let
  return (...args: A[]) => {
    if (result !== symbol) return result as R
    result = f(...args)
    return result
  }
}
