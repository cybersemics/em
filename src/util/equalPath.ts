import { equalThoughtRanked } from './equalThoughtRanked'
import { Path } from '../types'

/** Compares two thoughtsRanked arrays using { value, rank } as identity and ignoring other properties. */
export const equalPath = (a: Path, b: Path): boolean =>
  a === b || (a && b && a.length === b.length && a.every && a.every((_, i) => equalThoughtRanked(a[i], b[i])))
