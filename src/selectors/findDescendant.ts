import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import { State, ThoughtId } from '../@types'

/** Finds a descendant from the given thought, or returns null if it does not exist. */
const findDescendant = (state: State, thoughtId: ThoughtId, values: string | string[]): ThoughtId | null => {
  if (values.length === 0) return thoughtId
  if (!Array.isArray(values)) values = [values]
  const child = getAllChildrenAsThoughts(state, thoughtId).find(child => child.value === values[0])
  return child ? findDescendant(state, child.id, values.slice(1)) : null
}

export default findDescendant
