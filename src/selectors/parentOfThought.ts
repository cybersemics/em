import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from './getThoughtById'

/** Returns the parent Thought of a given ThoughtId. */
const parentOfThought = (state: State, thoughtId: ThoughtId): Thought | null => {
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return null
  const parentThought = getThoughtById(state, thought.parentId)
  return parentThought
}

export default parentOfThought
