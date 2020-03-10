/** Compares two thought objects using { value, rank } as identity and ignoring other properties. */
export const equalThoughtRanked = (a, b, isRankEqual = true) =>
  a === b || (a && b && a.value === b.value && (!isRankEqual || a.rank === b.rank))
