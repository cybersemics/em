import { getThoughtById } from './index'
import { State, Parent, ThoughtId } from '../@types'

/**
 * Returns the parent thought.
 */
const getParentThought = (state: State, thoughtId: ThoughtId): Parent | null => {
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return null
  const parentThought = getThoughtById(state, thought.parentId)
  return parentThought
}

export default getParentThought
