import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { findAnyChild } from '../selectors/getChildren'

/** Finds a descendant from the given thought, or returns null if it does not exist. If there are multiple siblings with the same value, which one is reterned is non-deterministic. */
const findDescendant = (state: State, thoughtId: ThoughtId | null, values: string | string[]): ThoughtId | null => {
  if (!thoughtId || values.length === 0) return thoughtId
  if (!Array.isArray(values)) values = [values]
  const child = findAnyChild(state, thoughtId, child => child.value === values[0])

  return child ? findDescendant(state, child.id, values.slice(1)) : null
}

export default findDescendant
