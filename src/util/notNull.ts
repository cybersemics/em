import { Index } from '../types'

// @ts-nocheck

/** Returns a shallow copy of an object with all keys that do not have a value of null or undefined. */
export const notNull = (o: Index) => Object.keys(o).reduce((acc, key) => o[key] !== null ? { ...acc, [key]: o[key] } : acc, {})
