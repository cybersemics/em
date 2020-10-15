/** Returns a function that calls the given function once then returns the same result forever. */
export const perma = <A extends any[], R>(f: (...args: A) => R) => {
  let result: any = null // eslint-disable-line fp/no-let
  return (...args: Parameters<typeof f>) => result || (result = f(...args))
}
