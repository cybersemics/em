import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { findAnyChild } from '../selectors/getChildren'

/** Finds a descendant by value, choosing the first matching sibling in canonical order. */
const findDescendant = (state: State, thoughtId: ThoughtId | null, values: string | string[]): ThoughtId | null => {
  if (!thoughtId || values.length === 0) return thoughtId
  if (!Array.isArray(values)) values = [values]
  const child = findAnyChild(state, thoughtId, child => child.value === values[0])
  return child ? findDescendant(state, child.id, values.slice(1)) : null
}

export default findDescendant
