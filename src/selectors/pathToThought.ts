import Path from '../@types/Path'
import State from '../@types/State'
import getThoughtById from './getThoughtById'
import parentContextId from './parentContextId'

/**
 * Gets the Thought displayed at the head of a Path.
 *
 * In the context view this is the context — `b` for the row `a/m~/b` — since that is the thought the user sees and
 * edits. For the Lexeme context the row stands for, use `getThoughtById(state, headId(path))`.
 */
const pathToThought = (state: State, path: Path) => getThoughtById(state, parentContextId(state, path))

export default pathToThought
