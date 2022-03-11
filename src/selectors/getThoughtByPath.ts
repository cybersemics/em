import { Path, State } from '../@types'
import { head } from '../util'
import getThoughtById from './getThoughtById'

/**
 * Gets the head Thought of a path.
 */
const getThoughtByPath = (state: State, path: Path) => getThoughtById(state, head(path))

export default getThoughtByPath
