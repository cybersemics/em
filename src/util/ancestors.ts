import { equalThoughtRanked } from './equalThoughtRanked'
import { Child } from '../types'


/** Returns a subset of thoughts from the start to the given thought (inclusive). */
export const ancestors = (thoughtsRanked: Child[], thoughtRanked: Child): Child[] => thoughtsRanked.slice(0, thoughtsRanked.findIndex(cur => equalThoughtRanked(cur, thoughtRanked)) + 1)
