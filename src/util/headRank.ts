//@ts-nocheck

import { head } from './head'

/** Returns the rank of the last thought in a path. */
export const headRank = path => head(path).rank
