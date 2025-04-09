import Path from '../@types/Path'
import State from '../@types/State'
import { getChildrenSorted } from '../selectors/getChildren'
import isContextViewActive from '../selectors/isContextViewActive'
import prevContext from '../selectors/prevContext'
import prevSibling from '../selectors/prevSibling'
import appendToPath from '../util/appendToPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import parentOf from '../util/parentOf'
import simplifyPath from './simplifyPath'

/** Gets the last visible descendant of a thought. */
const lastVisibleDescendant = (state: State, path: Path): Path => {
  const simplePath = simplifyPath(state, path)

  // Only traverse children if the thought or its parent is expanded
  if (!state.expanded[hashPath(simplePath)]) return path

  // If no children, return current path
  const children = getChildrenSorted(state, head(simplePath))
  if (children.length === 0) return path

  const lastChild = children[children.length - 1]
  return lastVisibleDescendant(state, appendToPath(path, lastChild.id))
}

/** Gets the previous thought in visual order. */
const prevThought = (state: State, path: Path): Path | null => {
  const pathParent = path.length > 1 ? parentOf(path) : null

  // If in context view, try to get previous context first
  if (isContextViewActive(state, pathParent)) {
    const prevContextThought = prevContext(state, path)
    if (prevContextThought) return appendToPath(pathParent, prevContextThought.id)

    // If no previous context, move to parent if not at root
    return pathParent
  }

  const prevSiblingThought = prevSibling(state, path)

  // If the previous sibling is expanded, return its last descendant.
  // Otherwise, if not in any context view and no previous sibling, return parent.
  return prevSiblingThought ? lastVisibleDescendant(state, appendToPath(pathParent, prevSiblingThought.id)) : pathParent
}

export default prevThought
