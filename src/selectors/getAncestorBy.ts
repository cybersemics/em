import { getThoughtById } from '.'
import { Index, Parent, State } from '../@types'
import { EM_TOKEN, ROOT_PARENT_ID } from '../constants'
import { normalizeThought } from '../util'

/**
 * Traverses the thought tree upwards from the given thought and returns the first ancestor that passes the check function.
 */
const getAncestorBy = (
  state: State,
  thoughtId: string,
  checkFn: (thought: Parent) => boolean,
  traversedIds: Index<boolean> = {},
): Parent | null => {
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return null
  const parentThought = getThoughtById(state, thought.parentId)
  if (!parentThought) return null

  if (traversedIds[parentThought.id]) {
    console.warn(
      `getAncestorBy: Circular path found for thoughtId:${parentThought.id} with value ${parentThought.value}`,
    )
    return null
  }

  const flag = checkFn(parentThought)
  return flag
    ? parentThought
    : getAncestorBy(state, parentThought.id, checkFn, {
        ...traversedIds,
        [thought.id]: true,
        [parentThought.id]: true,
      })
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
