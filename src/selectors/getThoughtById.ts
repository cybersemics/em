import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'

/** Gets a thought from this state's immutable document view, or undefined if it is absent. */
const getThoughtById = (state: State, id: ThoughtId): Thought | undefined => state.thoughts.getThought(id)

export default getThoughtById
