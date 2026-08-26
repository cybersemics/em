import Path from '../@types/Path'
import State from '../@types/State'
import contextThoughtId from './contextThoughtId'
import getThoughtById from './getThoughtById'

/**
 * Gets the Thought displayed at the head of a Path.
 *
 * In the context view this is the context — `b` for the row `a/m~/b` — since that is the thought the user sees and
 * edits. For the Lexeme instance the row stands for, use `getThoughtById(state, headId(path))`.
 */
const pathToThought = (state: State, path: Path) => getThoughtById(state, contextThoughtId(state, path))

export default pathToThought
