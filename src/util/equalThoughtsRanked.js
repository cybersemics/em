import { equalThoughtRanked } from './equalThoughtRanked.js'

/** Compares two thoughtsRanked arrays using { key, rank } as identity and ignoring other properties. */
export const equalThoughtsRanked = (a, b) =>
  a === b || (a && b && a.length === b.length && a.every && a.every((_, i) => equalThoughtRanked(a[i], b[i])))
