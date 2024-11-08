import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'

/**
 * Gets a Thought by its ThoughtId.
 */
const getThoughtById = (state: State, id: ThoughtId) => state.thoughts.thoughtIndex[id]

export default getThoughtById
