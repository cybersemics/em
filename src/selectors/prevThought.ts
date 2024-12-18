import Path from '../@types/Path'
import State from '../@types/State'
import getChildren, { isVisible } from '../selectors/getChildren'
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

  const children = getChildren(state, head(simplePath))
  // If no children, return current path
  if (children.length === 0) return path

  const lastChild = children[children.length - 1]
  return lastVisibleDescendant(state, appendToPath(path, lastChild.id))
}

/**
 * Gets the last visible descendant of the previous sibling.
 * If the previous sibling is hidden, recursively tries the next previous sibling.
 */
const getLastVisibleDescendantOfPreviousSibling = (
  state: State,
  path: Path,
  currentSibling: Path | null = null,
): Path | null => {
  const currentPath = currentSibling || path
  const prevSiblingThought = prevSibling(state, currentPath)

  if (!prevSiblingThought) return null

  // Skip hidden thoughts only when showHiddenThoughts is false
  if (state.showHiddenThoughts || isVisible(state, prevSiblingThought)) {
    const prevSiblingPath = appendToPath(parentOf(path), prevSiblingThought.id)
    return lastVisibleDescendant(state, prevSiblingPath)
  }

  const prevPath = appendToPath(parentOf(path), prevSiblingThought.id)
  return getLastVisibleDescendantOfPreviousSibling(state, path, prevPath)
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

  // If the previous sibling is expanded, return its last descendant.
  // Otherwise, if not in any context view and no previous sibling, return parent.
  return getLastVisibleDescendantOfPreviousSibling(state, path) || pathParent
}

export default prevThought
