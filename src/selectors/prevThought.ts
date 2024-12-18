import Path from '../@types/Path'
import State from '../@types/State'
import getChildren, { isVisible } from '../selectors/getChildren'
import isContextViewActive from '../selectors/isContextViewActive'
import prevContext from '../selectors/prevContext'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'
import getThoughtById from './getThoughtById'
import simplifyPath from './simplifyPath'

/** Gets the last visible descendant of a thought. */
const lastVisibleDescendant = (state: State, path: Path): Path => {
  // Use simplifyPath only if we're in context view mode
  const isInContextView = Object.keys(state.contextViews).length > 0 && path.length > 1
  const effectivePath = isInContextView ? simplifyPath(state, path) : path
  const id = head(effectivePath)

  // Only traverse children if the thought or its parent is expanded
  if (!state.expanded[hashPath(effectivePath)]) return path

  const children = getChildren(state, id)
  // If no children, return current path
  if (children.length === 0) return path

  const lastChild = children[children.length - 1]
  return lastVisibleDescendant(state, appendToPath(path, lastChild.id))
}

/** Gets the last context in a context view. */
const lastContext = (state: State, path: Path): Path | null => {
  const thought = getThoughtById(state, head(path))
  const contexts = getContextsSortedAndRanked(state, thought.value).filter(
    context => state.showHiddenThoughts || isVisible(state, getThoughtById(state, context.id)),
  )

  // if context view is empty or no visible contexts, return null
  if (contexts.length === 0) return null

  // get the last visible context
  const lastContext = getThoughtById(state, contexts[contexts.length - 1]?.id)
  if (!state.expanded[hashPath(appendToPath(path, lastContext.parentId))])
    return appendToPath(path, lastContext.parentId)
  return lastVisibleDescendant(state, appendToPath(path, lastContext.parentId))
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
  const isHidden = !state.showHiddenThoughts && !isVisible(state, prevSiblingThought)
  if (!isHidden) {
    const prevSiblingPath = appendToPath(parentOf(path), prevSiblingThought.id)
    return lastVisibleDescendant(state, prevSiblingPath)
  }

  const prevPath = appendToPath(parentOf(path), prevSiblingThought.id)
  return getLastVisibleDescendantOfPreviousSibling(state, path, prevPath)
}

/** Recursively checks if any parent up to root is a context view root. */
const findContextViewRoot = (state: State, path: Path): Path | null => {
  if (isRoot(path)) return null
  if (isContextViewActive(state, path)) return path
  return findContextViewRoot(state, rootedParentOf(state, path))
}

/** Gets the previous thought in visual order. */
const prevThought = (state: State, path?: Path): Path | null => {
  if (!path) return null

  const pathParent = rootedParentOf(state, path)
  const isRootLevel = isRoot(pathParent)

  // Check if we're in a context view
  const inContextView = isContextViewActive(state, pathParent)
  const hasActiveContextViews = Object.keys(state.contextViews).length > 0
  // If in context view, try to get previous context first
  if (inContextView) {
    const prevContextThought = prevContext(state, path)
    if (prevContextThought) return appendToPath(pathParent, prevContextThought.id)

    // If no previous context, move to parent if not at root
    return isRootLevel ? null : pathParent
  }

  const prevSiblingPath = getLastVisibleDescendantOfPreviousSibling(state, path)
  // If we have active context views, check for context view boundaries
  if (hasActiveContextViews && prevSiblingPath && path.length === 1) {
    // Check if previous sibling is in a context view
    const prevContextViewRoot = findContextViewRoot(state, prevSiblingPath)
    if (prevContextViewRoot) return lastContext(state, prevContextViewRoot)
  }

  if (prevSiblingPath) return prevSiblingPath

  // If at root level, stop here - don't traverse up to parent
  if (isRootLevel) return null

  // If not at root level and no previous sibling, check if parent is in context view
  if (hasActiveContextViews && path.length === 1) {
    const parentContextViewRoot = findContextViewRoot(state, pathParent)
    if (parentContextViewRoot) return lastContext(state, parentContextViewRoot)
  }

  // If not in any context view and no previous sibling, return parent
  return pathParent
}

export default prevThought
