import Path from '../@types/Path'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import head from './head'

// @MIGRATION_TODO: Fix all logic that uses headRank
/** Returns the rank of the last thought in a path. */
const headRank = (state: State, path: Path) => getThoughtById(state, head(path)).rank

export default headRank
