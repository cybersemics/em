import { Thought, PropertyRequired } from '../@types'

/** Compares two thought objects using { value } as identity and ignoring other properties. */
export const equalThoughtSorted = (
  a: PropertyRequired<Thought, 'value'>,
  b: PropertyRequired<Thought, 'value'>,
): boolean => a === b || (a && b && a.value === b.value)
