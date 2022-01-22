import { getThoughtById } from './index'
import { Index, Parent, State, ThoughtId } from '../@types'

/**
 * Traverses the thought tree upwards from the given thought and returns the first ancestor that passes the check function.
 */
const getAncestorBy = (
  state: State,
  thoughtId: ThoughtId,
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
 * Get ancestor by normalized value.
 */
export const getAncestorByValue = (state: State, thoughtId: ThoughtId, normalizedValue: string) =>
  getAncestorBy(state, thoughtId, thought => thought.value === normalizedValue)

export default getAncestorBy
