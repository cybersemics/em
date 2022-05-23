import { findDescendant, isChildVisible } from '../selectors'
import { getAllChildrenAsThoughtsById } from './getChildren'
import { State, ThoughtId } from '../@types'

/** Returns the value of an attribute of the given context. O(children). Use attributeEquals for O(1) attribute equality check. Use a combination of hasChild and attribute to check if an attribute exists but has no children. */
const attribute = (state: State, thoughtId: ThoughtId, attributeName: string) => {
  const attributeId = findDescendant(state, thoughtId, attributeName)
  const attributeChildren = attributeId ? getAllChildrenAsThoughtsById(state, attributeId) : []
  const firstVisibleChild = attributeId ? attributeChildren.find(isChildVisible(state)) : null
  return firstVisibleChild ? firstVisibleChild.value : null
}

export default attribute
