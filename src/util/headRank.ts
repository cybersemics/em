import { Path } from '../@types'
import { head } from './head'

/** Returns the rank of the last thought in a path. */
export const headRank = (path: Path) => head(path).rank
