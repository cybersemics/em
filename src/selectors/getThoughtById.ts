import ThoughtId from '../@types/ThoughtId'
import State from '../@types/State'

/**
 * Gets a Thought by its ThoughtId.
 */
const getThoughtById = (state: State, id: ThoughtId) => state.thoughts.thoughtIndex[id]

export default getThoughtById
