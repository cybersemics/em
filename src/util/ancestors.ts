//@ts-nocheck

import { equalThoughtRanked } from './equalThoughtRanked'

/** Returns a subset of thoughts from the start to the given thought (inclusive). */
export const ancestors = (thoughtsRanked, thoughtRanked) => thoughtsRanked.slice(0, thoughtsRanked.findIndex(cur => equalThoughtRanked(cur, thoughtRanked)) + 1)
