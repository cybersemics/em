import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild, isVisible } from './getChildren'

/** Returns the value of a visible child attribute, or null if the attribute is absent or has no visible child. Use findDescendant to distinguish those cases. Meta-attribute lookups are cached within the immutable document view. */
const attribute = (state: State, thoughtId: ThoughtId | null, attributeName: string): string | null => {
  const attributeId = findDescendant(state, thoughtId, attributeName)
  if (!attributeId) return null
  const firstVisibleChild = findAnyChild(state, attributeId, isVisible(state))
  return firstVisibleChild?.value ?? null
}

export default attribute
