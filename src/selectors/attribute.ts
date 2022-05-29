import { findDescendant, isChildVisible } from '../selectors'
import { getAllChildrenAsThoughts } from './getChildren'
import { State, ThoughtId } from '../@types'

/** Returns the value of a visible child attribute of a thought. Use a combination of findDescendant and attribute to check if an attribute exists but has no children. O(1) as long as attributeName is a meta attribute and can take advantage of childrenMap. */
const attribute = (state: State, thoughtId: ThoughtId | null, attributeName: string) => {
  const attributeId = findDescendant(state, thoughtId, attributeName)
  const attributeChildren = getAllChildrenAsThoughts(state, attributeId)
  const firstVisibleChild = attributeChildren.find(isChildVisible(state))
  return firstVisibleChild?.value || null
}

export default attribute
