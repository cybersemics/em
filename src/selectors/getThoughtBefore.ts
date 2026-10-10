import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { getChildrenSorted } from '../selectors/getChildren'
import head from '../util/head'
import getThoughtById from './getThoughtById'
import rootedParentOf from './rootedParentOf'

/** Gets the preceding visible sibling in the context's sort order. */
const getThoughtBefore = (state: State, simplePath: SimplePath) => {
  const cursorThought = getThoughtById(state, head(simplePath))
  if (!cursorThought) return null
  const parentPath = rootedParentOf(state, simplePath)
  const children = getChildrenSorted(state, head(parentPath))
  const i = children.findIndex(child => child.id === cursorThought.id)
  return i === -1 ? null : children[i - 1]
}

export default getThoughtBefore
