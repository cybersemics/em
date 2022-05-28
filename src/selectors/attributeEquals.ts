import { State, ThoughtId } from '../@types'
import { findDescendant, getThoughtById } from '../selectors'
import { isFunction } from '../util'

/** Returns true if the given attribute equals the given value. O(1). Use over attribute when possible for performance. */
const attributeEquals = (state: State, parentId: ThoughtId | null, attr: string, value: string): boolean => {
  if (!parentId) return false
  if (isFunction(attr)) {
    const parent = getThoughtById(state, parentId)
    const attrId = parent?.childrenMap?.[attr] || findDescendant(state, parentId, attr)
    if (!attrId) return false
    const thoughtAttr = getThoughtById(state, attrId)
    return !!thoughtAttr?.childrenMap?.[value] || !!findDescendant(state, attrId, value)
  }
  return !!findDescendant(state, parentId, [attr, value])
}

export default attributeEquals
