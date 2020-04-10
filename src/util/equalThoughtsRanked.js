import { equalThoughtRanked } from './equalThoughtRanked'

/** Compares two arrays of ThoughtRanked based on equalThoughtRanked */
export const equalThoughtsRanked = (a, b) =>
  a && b && Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((_, i) => equalThoughtRanked(a[i], b[i]))
