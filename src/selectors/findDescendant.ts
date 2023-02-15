import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { findAnyChild } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isAttribute from '../util/isAttribute'

/** Calls getThoughtById with a nullable ThoughtId. Returns null if id is null. */
const getThoughtByIdGuarded = (state: State, id?: ThoughtId | null) => id && getThoughtById(state, id)

/** Finds a descendant from the given thought, or returns null if it does not exist. If there are multiple siblings with the same value, which one is reterned is non-deterministic. */
const findDescendant = (state: State, thoughtId: ThoughtId | null, values: string | string[]): ThoughtId | null => {
  if (!thoughtId || values.length === 0) return thoughtId
  if (!Array.isArray(values)) values = [values]
  // if the value is a meta attribute, use childrenMap for O(1) lookup
  const child =
    isAttribute(values[0]) && getThoughtById(state, thoughtId)
      ? getThoughtByIdGuarded(state, getThoughtById(state, thoughtId)?.childrenMap[values[0]])
      : findAnyChild(state, thoughtId, child => child.value === values[0])
  return child ? findDescendant(state, child.id, values.slice(1)) : null
}

export default findDescendant
