import Index from '../@types/IndexType'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from './getThoughtById'

/**
 * Traverses the thought tree upwards from the given thought and returns the first ancestor that passes the check function. O(depth).
 */
export const getAncestorBy = (
  state: State,
  thoughtId: ThoughtId,
  predicate: (thought: Thought) => boolean,
  traversedIds: Index<boolean> = {},
): Thought | null => {
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

  return predicate(parentThought)
    ? parentThought
    : getAncestorBy(state, parentThought.id, predicate, {
        ...traversedIds,
        [thought.id]: true,
        [parentThought.id]: true,
      })
}

/**
 * Get ancestor by value.
 */
export const getAncestorByValue = (state: State, thoughtId: ThoughtId, value: string) =>
  getAncestorBy(state, thoughtId, thought => thought.value === value)

export default getAncestorByValue
