import { equalThoughtRanked } from './equalThoughtRanked.js'

/** Returns a subset of items from the start to the given item (inclusive) */
export const ancestors = (thoughtsRanked, thoughtRanked) => thoughtsRanked.slice(0, thoughtsRanked.findIndex(cur => equalThoughtRanked(cur, thoughtRanked)) + 1)
