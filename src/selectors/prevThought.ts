import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_TOKEN } from '../constants'
import expandThoughts from '../selectors/expandThoughts'
import { getAllChildrenAsThoughts, isVisible } from '../selectors/getChildren'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'

/** Checks if a thought is expanded using the expandThoughts selector. */
const isExpanded = (state: State, path: Path): boolean => {
  const expandedPathMap = expandThoughts(state, state.cursor)
  return !!expandedPathMap[hashPath(path)]
}

/** Gets the last visible descendant of a thought. */
const lastVisibleDescendant = (state: State, path: Path): Path => {
  const id = head(path)

  // Only traverse children if the thought or its parent is expanded
  if (!isExpanded(state, path)) return path

  // When showHiddenThoughts is true, show all children, otherwise filter hidden ones
  const children = state.showHiddenThoughts
    ? getAllChildrenAsThoughts(state, id)
    : getAllChildrenAsThoughts(state, id).filter(child => isVisible(state, child))

  // If no children, return current path
  if (children.length === 0) return path

  const lastChild = children[children.length - 1]
  if (!lastChild) return path

  const childPath = appendToPath(path, lastChild.id)
  return lastVisibleDescendant(state, childPath)
}

/** Gets the previous thought in visual order. */
const prevThought = (state: State, path?: Path): Path | null => {
  if (!path) {
    // Get all root children, showing hidden thoughts if showHiddenThoughts is true
    const rootChildren = state.showHiddenThoughts
      ? getAllChildrenAsThoughts(state, HOME_TOKEN)
      : getAllChildrenAsThoughts(state, HOME_TOKEN).filter(child => isVisible(state, child))

    if (rootChildren.length === 0) return null

    // Return the last visible root child
    const lastChild = rootChildren[rootChildren.length - 1]
    return [lastChild.id]
  }

  const pathParent = rootedParentOf(state, path)
  const isRootLevel = isRoot(pathParent)

  // Get previous visible sibling
  let prevSiblingThought = prevSibling(state, path)

  // Skip hidden thoughts only when showHiddenThoughts is false
  while (!state.showHiddenThoughts && prevSiblingThought && !isVisible(state, prevSiblingThought)) {
    const prevPath = appendToPath(parentOf(path), prevSiblingThought.id)
    prevSiblingThought = prevSibling(state, prevPath)
  }

  if (prevSiblingThought) {
    // If previous sibling exists, get its last visible descendant
    const prevSiblingPath = appendToPath(parentOf(path), prevSiblingThought.id)
    return lastVisibleDescendant(state, prevSiblingPath)
  }

  // If at root level, stop here - don't traverse up to parent
  if (isRootLevel) return null

  // If not at root level and no previous sibling, return parent
  return pathParent
}

export default prevThought
