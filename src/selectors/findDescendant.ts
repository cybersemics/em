import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import { getThoughtById } from '../selectors'
import { isFunction } from '../util'
import { State, ThoughtId } from '../@types'

/** Calls getThoughtById with a nullable ThoughtId. Returns null if id is null. */
const getThoughtByIdGuarded = (state: State, id?: ThoughtId | null) => id && getThoughtById(state, id)

/** Finds a descendant from the given thought, or returns null if it does not exist. */
const findDescendant = (state: State, thoughtId: ThoughtId | null, values: string | string[]): ThoughtId | null => {
  if (!thoughtId || values.length === 0) return thoughtId
  if (!Array.isArray(values)) values = [values]
  // if the value is a meta attribute, use childrenMap for O(1) lookup
  const child =
    isFunction(values[0]) && getThoughtById(state, thoughtId)
      ? getThoughtByIdGuarded(state, getThoughtById(state, thoughtId)?.childrenMap[values[0]])
      : getAllChildrenAsThoughts(state, thoughtId).find(child => child.value === values[0])
  return child ? findDescendant(state, child.id, values.slice(1)) : null
}

export default findDescendant
