import { Child, PropertyRequired } from '../@types'

/** Compares two thought objects using { value } as identity and ignoring other properties. */
export const equalThoughtSorted = (a: PropertyRequired<Child, 'value'>, b: PropertyRequired<Child, 'value'>): boolean =>
  a === b || (a && b && a.value === b.value)
