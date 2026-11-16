import Path from '../@types/Path'
import State from '../@types/State'
import displayedChildPaths from '../selectors/displayedChildPaths'
import displayedParentOf from '../selectors/displayedParentOf'
import getContextViewEntries from '../selectors/getContextViewEntries'
import isContextViewActive from '../selectors/isContextViewActive'
import prevSibling from '../selectors/prevSibling'
import appendToPath from '../util/appendToPath'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'

/** Gets the last visible descendant of a thought. */
const lastVisibleDescendant = (state: State, path: Path): Path => {
  // Only traverse children if the thought or its parent is expanded
  if (!state.expanded[hashPath(path)]) return path

  // If no children, return current path
  const children = displayedChildPaths(state, path)
  if (children.length === 0) return path

  const lastChild = children[children.length - 1]
  return lastVisibleDescendant(state, lastChild)
}

/** Gets the previous thought in visual order. */
const prevThought = (state: State, path: Path): Path | null => {
  const pathParent = path.length > 1 ? displayedParentOf(state, path) : null

  // If in context view, try to get previous context first
  if (isContextViewActive(state, pathParent)) {
    const entries = getContextViewEntries(state, pathParent!)
    const index = entries.findIndex(entry => equalPath(entry.path, path))
    if (index > 0) return lastVisibleDescendant(state, entries[index - 1].path)

    // If no previous context, move to parent if not at root
    return pathParent
  }

  const prevSiblingThought = prevSibling(state, path)

  // If the previous sibling is expanded, return its last descendant.
  // Otherwise, if not in any context view and no previous sibling, return parent.
  return prevSiblingThought ? lastVisibleDescendant(state, appendToPath(pathParent, prevSiblingThought.id)) : pathParent
}

export default prevThought
