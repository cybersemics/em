import { getThoughtById } from './index'
import { State, Context, ThoughtId } from '../@types'
import { ROOT_PARENT_ID } from '../constants'

/**
 * Traverses the thought tree upwards from the given thought and returns the rooted context.
 */
const thoughtToContext = (state: State, thoughtId: ThoughtId): Context | null => {
  if (thoughtId === ROOT_PARENT_ID) return []
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return null
  const recursiveContext = thoughtToContext(state, thought.parentId)
  if (!recursiveContext) return null
  return [...recursiveContext, thought.value]
}

export default thoughtToContext
