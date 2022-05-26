import { findDescendant, isChildVisible } from '../selectors'
import { getAllChildrenAsThoughts } from './getChildren'
import { State, ThoughtId } from '../@types'

/** Returns the value of an attribute of the given context. O(children). Use attributeEquals for O(1) attribute equality check. Use a combination of hasChild and attribute to check if an attribute exists but has no children. */
const attribute = (state: State, thoughtId: ThoughtId, attributeName: string) => {
  const attributeId = findDescendant(state, thoughtId, attributeName)
  if (!attributeId) return null
  const attributeChildren = getAllChildrenAsThoughts(state, attributeId)
  const firstVisibleChild = attributeChildren.find(isChildVisible(state))
  return firstVisibleChild ? firstVisibleChild.value : null
}

export default attribute
