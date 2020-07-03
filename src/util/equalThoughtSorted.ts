import { Child } from '../types'

/** Compares two thought objects using { value } as identity and ignoring other properties. */
export const equalThoughtSorted = (a: Child, b: Child): boolean =>
  a === b || (a && b && a.value === b.value)
