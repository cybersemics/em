import { head } from './head'
import { Path } from '../types'

/** Returns the rank of the last thought in a path. */
export const headRank = (path: Path) => head(path).rank
