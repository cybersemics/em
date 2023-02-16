import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild, isVisible } from './getChildren'

/** Returns the value of a visible child attribute of a thought. Use a combination of findDescendant and attribute to check if an attribute exists but has no children. O(1) as long as attributeName is a meta attribute and can take advantage of childrenMap. */
const attribute = (state: State, thoughtId: ThoughtId | null, attributeName: string): string | null => {
  const attributeId = findDescendant(state, thoughtId, attributeName)
  if (!attributeId) return null
  const firstVisibleChild = findAnyChild(state, attributeId, isVisible(state))
  return firstVisibleChild?.value || null
}

export default attribute
