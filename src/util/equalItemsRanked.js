import { equalItemRanked } from './equalItemRanked.js'

/** Compares two itemsRanked arrays using { key, rank } as identity and ignoring other properties. */
export const equalItemsRanked = (a, b) =>
  a === b || (a && b && a.length === b.length && a.every && a.every((_, i) => equalItemRanked(a[i], b[i])))
