import { State, Context } from '../@types'
import { ROOT_PARENT_ID } from '../constants'

/**
 * Traverses the thought tree upwards from the given thought and returns the rooted context.
 */
const getContextForThought = (state: State, thoughtId: string): Context | null => {
  if (thoughtId === ROOT_PARENT_ID) return []
  const thought = state.thoughts.contextIndex[thoughtId]
  if (!thought) return null
  const recursiveContext = getContextForThought(state, thought.parentId)
  if (!recursiveContext) return null
  return [...recursiveContext, thought.value]
}

export default getContextForThought
