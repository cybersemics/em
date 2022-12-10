import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { getChildrenSorted } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import head from '../util/head'
import parentOf from '../util/parentOf'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'

/** Gets the previous sibling of a thought according to its parent's sort preference. Supports normal view and context view. */
export const prevSibling = (state: State, path: Path): Thought | null => {
  const id = head(path)
  const thought = getThoughtById(state, id)
  if (!thought) return null

  const parentPath = parentOf(path)
  const showContexts = isContextViewActive(state, parentPath)

  const siblings = showContexts
    ? getContextsSortedAndRanked(state, getThoughtById(state, head(parentPath)).value)
    : getChildrenSorted(state, thought.parentId)

  // in context view, we need to match the context's parentId, since all context's ids refer to lexeme instances
  const index = siblings.findIndex(child => (showContexts ? child.parentId : child.id) === id)

  const prev = siblings[index - 1]

  // in context view, we select then parent since prev again refers to the lexeme instance
  return prev ? (showContexts ? getThoughtById(state, prev.parentId) : prev) : null
}

export default prevSibling
