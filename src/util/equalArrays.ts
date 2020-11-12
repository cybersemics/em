/** Equality for lists of lists. */
export const equalArrays = <T>(a: T[], b: T[]): boolean =>
  a === b ||
  (a && b &&
  a.length === b.length &&
  a.find &&
  // compare with null to avoid false positive for ''
  a.find((thought, i) => b[i] !== thought)) == null
