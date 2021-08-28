import proxyMemoize from 'proxy-memoize'

/** Memoizes a function with any number of arguments. Wraps proxy-memoize. Disables WeakMap so size is required (default: 1000). */
export const memoize = <T extends any[], R>(f: (...args: T) => R, { size }: { size: number }): ((...args: T) => R) => {
  const memoized = proxyMemoize((args: T) => f(...args), { size: size || 1000 })
  return (...args: T) => memoized(args)
}
