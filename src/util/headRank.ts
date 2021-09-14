import { Path, State } from '../@types'
import { getThoughtById } from '../selectors'
import { head } from './head'

// @MIGRATION_TODO: Fix all logic that uses headRank
/** Returns the rank of the last thought in a path. */
export const headRank = (state: State, path: Path) => getThoughtById(state, head(path)).rank
