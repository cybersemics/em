// @ts-nocheck

/** Returns a function that calls the given function once then returns the same result forever. */
export const perma = f => {
  let result = null // eslint-disable-line fp/no-let
  return (...args) => result || (result = f(...args))
}
