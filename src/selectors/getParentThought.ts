import { getThoughtById } from '.'
import { State, Parent } from '../@types'

/**
 * Returns the parent thought.
 */
const getParentThought = (state: State, thoughtId: string): Parent | null => {
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return null
  const parentThought = getThoughtById(state, thought.parentId)
  return parentThought
}

export default getParentThought
