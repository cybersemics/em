import { Index } from '../types'

/** Returns a shallow copy of an object with all keys that do not have a value of null or undefined. */
export const notNull = <T>(o: Index<T>) =>
  Object.keys(o).reduce((acc, key) =>
    o[key] !== null
      ? { ...acc, [key]: o[key] }
      : acc
  , {} as Index<T>)
