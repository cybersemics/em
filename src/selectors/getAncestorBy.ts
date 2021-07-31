import { Parent, State } from '../@types'
import { EM_TOKEN, ROOT_PARENT_ID } from '../constants'
import { normalizeThought } from '../util'

/**
 * Traverses the thought tree upwards from the given thought and returns the first ancestor that passes the check function.
 */
const getAncestorBy = (state: State, thoughtId: string, checkFn: (thought: Parent) => boolean): Parent | null => {
  const thought = state.thoughts.contextIndex[thoughtId]
  if (!thought) return null
  const parentThought = state.thoughts.contextIndex[thought.parentId]
  if (!parentThought) return null

  const flag = checkFn(parentThought)
  return flag ? parentThought : getAncestorBy(state, parentThought.id, checkFn)
}
/**
 * Check if thought is the descendant of the em context.
 */
export const isDescendantOfEmContext = (state: State, thoughtId: string) =>
  getAncestorBy(state, thoughtId, thought => thought.value === EM_TOKEN && thought.parentId === ROOT_PARENT_ID)

/**
 * Get ancestor by normalized value.
 */
export const getAncestorByValue = (state: State, thoughtId: string, normalizedValue: string) =>
  getAncestorBy(state, thoughtId, thought => normalizeThought(thought.value) === normalizedValue)

export default getAncestorBy
