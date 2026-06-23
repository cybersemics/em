import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'

/** Returns true if the given attribute equals the given value. */
const attributeEquals = (state: State, parentId: ThoughtId | null, attr: string, value: string): boolean => {
  if (!parentId) return false
  return !!findDescendant(state, parentId, [attr, value])
}

export default attributeEquals
