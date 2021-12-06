import { Parent, PropertyRequired } from '../@types'

/** Compares two thought objects using { value, rank } as identity and ignoring other properties. */
export const equalThoughtRanked = (
  a: PropertyRequired<Parent, 'value' | 'rank'>,
  b: PropertyRequired<Parent, 'value' | 'rank'>,
): boolean => a === b || (a && b && a.value === b.value && a.rank === b.rank)
