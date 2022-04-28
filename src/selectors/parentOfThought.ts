import { getThoughtById } from './index'
import { State, Thought, ThoughtId } from '../@types'

/**
 * Returns the parent thought.
 */
const parentOfThought = (state: State, thoughtId: ThoughtId): Thought | null => {
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return null
  const parentThought = getThoughtById(state, thought.parentId)
  return parentThought
}

export default parentOfThought
