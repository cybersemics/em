import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild, isVisible } from './getChildren'

/** Returns the value of a visible child attribute of a thought. Returns null if the attribute does not exist or has no child. Use a combination of findDescendant and attribute to distinguish these cases, i.e. .to check if an attribute exists but has no children. If attributeName is a meta attribute, performs in O(1) due to special childrenMap keys of attributes. */
const attribute = (state: State, thoughtId: ThoughtId | null, attributeName: string): string | null => {
  const attributeId = findDescendant(state, thoughtId, attributeName)
  if (!attributeId) return null
  const firstVisibleChild = findAnyChild(state, attributeId, isVisible(state))
  return firstVisibleChild?.value ?? null
}

export default attribute
