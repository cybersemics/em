import { equalThoughtRanked } from './equalThoughtRanked'
import { Child } from '../@types'

/** Compares two path arrays using { value, rank } as identity and ignoring other properties. */
export const equalPath = (a: Child[] | null | undefined, b: Child[] | null | undefined): boolean =>
  a === b || (!!a && !!b && a.length === b.length && a.every && a.every((_, i) => equalThoughtRanked(a[i], b[i])))
