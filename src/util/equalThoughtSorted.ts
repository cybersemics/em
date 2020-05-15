//@ts-nocheck

/** Compares two thought objects using { value } as identity and ignoring other properties. */
export const equalThoughtSorted = (a, b) =>
  a === b || (a && b && a.value === b.value)
