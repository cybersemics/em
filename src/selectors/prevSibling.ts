import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { getChildrenSorted } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import head from '../util/head'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'

/**
 * Gets the previous sibling of a thought according to its parent's sort preference.
 */
export const prevSibling = (state: State, path: Path): Thought | null => {
  const id = head(path)
  const thought = getThoughtById(state, id)
  if (!thought) return null

  const contextViewActive = isContextViewActive(state, path)

  const siblings = contextViewActive
    ? getContextsSortedAndRanked(state, getThoughtById(state, thought.parentId).value)
    : getChildrenSorted(state, thought.parentId)

  const index = siblings.findIndex(child => child.id === id)
  return siblings[index - 1] || null
}

export default prevSibling
