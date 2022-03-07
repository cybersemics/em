import { ThoughtId, State } from '../@types'

/**
 * Gets a Thought by its id.
 */
const getThoughtById = (state: State, id: ThoughtId) => state.thoughts.thoughtIndex[id]

export default getThoughtById
