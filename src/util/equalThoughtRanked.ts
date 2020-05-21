import { Thought, Child } from "../types";

/** Compares two thought objects using { value, rank } as identity and ignoring other properties. */
export const equalThoughtRanked = (a: (Thought | Child), b: (Thought | Child)): boolean =>
  a === b || (a && b && a.value === b.value && a.rank === b.rank)
