/** Compares two item objects using { key, rank } as identity and ignoring other properties. */
export const equalItemRanked = (a, b) =>
  a === b || (a && b && a.key === b.key && a.rank === b.rank)
