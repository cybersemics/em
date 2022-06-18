import Path from '../@types/Path'
import State from '../@types/State'
import head from '../util/head'
import getThoughtById from './getThoughtById'

/**
 * Gets the head Thought of a path.
 */
const pathToThought = (state: State, path: Path) => getThoughtById(state, head(path))

export default pathToThought
