import { equalThoughtRanked } from './equalThoughtRanked'
import { Child, Path } from '../types'

/** Returns a subset of thoughts from the start to the given thought (inclusive). */
export const ancestors = (thoughtsRanked: Path, thoughtRanked: Child): Path =>
  thoughtsRanked.slice(0, thoughtsRanked.findIndex(cur => equalThoughtRanked(cur, thoughtRanked)) + 1)
