import { equalThoughtRanked } from './equalThoughtRanked'
import { Thought } from '../types'


/** Returns a subset of thoughts from the start to the given thought (inclusive). */
export const ancestors = (thoughtsRanked: Thought[], thoughtRanked: Thought): Thought[] => thoughtsRanked.slice(0, thoughtsRanked.findIndex(cur => equalThoughtRanked(cur, thoughtRanked)) + 1)
