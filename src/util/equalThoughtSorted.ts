import { Parent, PropertyRequired } from '../@types'

/** Compares two thought objects using { value } as identity and ignoring other properties. */
export const equalThoughtSorted = (
  a: PropertyRequired<Parent, 'value'>,
  b: PropertyRequired<Parent, 'value'>,
): boolean => a === b || (a && b && a.value === b.value)
