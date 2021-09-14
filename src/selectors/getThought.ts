import { Child, Path, State } from '../@types'
import { head } from '../util'

/**
 * Get parent entry for the given thought id.
 */
export const getThoughtById = (state: State, id: Child) => state.thoughts.contextIndex[id]

/**
 * Get parent entry for the given path.
 */
export const getThoughtByPath = (state: State, path: Path) => getThoughtById(state, head(path))
