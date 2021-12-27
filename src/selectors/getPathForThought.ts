import { getThoughtById } from './index'
import { State, ThoughtId } from '../@types'
import { ROOT_PARENT_ID } from '../constants'

// Note: This function is here for transition to independent editing. Not all low level reducers yet support opertaions by id instead of whole path.
/**
 * Traverses the thought tree upwards from the given thought and returns the rooted path.
 */
const getPathForThought = (state: State, thoughtId: ThoughtId): ThoughtId[] | null => {
  if (thoughtId === ROOT_PARENT_ID) return []
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return null
  const recursiveContext = getPathForThought(state, thought.parentId)
  if (!recursiveContext) return null
  return [...recursiveContext, thought.id]
}

export default getPathForThought
