/** Returns a function that calls the given function once then returns the same result forever. */
export const perma = <A extends any[], R>(f: (...args: A) => R): typeof f => {
  let result: R // eslint-disable-line fp/no-let
  return (...args: A) => result || f(...args)
}
