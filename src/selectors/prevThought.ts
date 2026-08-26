import Path from '../@types/Path'
import State from '../@types/State'
import { getChildrenSorted } from '../selectors/getChildren'
import prevContext from '../selectors/prevContext'
import prevSibling from '../selectors/prevSibling'
import appendToPath from '../util/appendToPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import headId from '../util/headId'
import parentOf from '../util/parentOf'
import { isContextStep, replaceHead } from '../util/pathStep'

/** Gets the last visible descendant of a thought. */
const lastVisibleDescendant = (state: State, path: Path): Path => {
  // state.expanded is keyed by the full Path, including its context-view steps (see expandThoughts), so the lookup
  // must use the same Path rather than the simplified one
  if (!state.expanded[hashPath(path)]) return path

  // children come from the thought the path lands on, which in the context view is the Lexeme instance
  const children = getChildrenSorted(state, headId(path))
  if (children.length === 0) return path

  const lastChild = children[children.length - 1]
  return lastVisibleDescendant(state, appendToPath(path, lastChild.id))
}

/** Gets the previous thought in visual order. */
const prevThought = (state: State, path: Path): Path | null => {
  const pathParent = path.length > 1 ? parentOf(path) : null

  // If in context view, try to get previous context first
  if (isContextStep(head(path))) {
    const prevContextThought = prevContext(state, path)
    if (prevContextThought) return replaceHead(path, prevContextThought.id)

    // If no previous context, move to parent if not at root
    return pathParent
  }

  const prevSiblingThought = prevSibling(state, path)

  // If the previous sibling is expanded, return its last descendant.
  // Otherwise, if not in any context view and no previous sibling, return parent.
  return prevSiblingThought ? lastVisibleDescendant(state, replaceHead(path, prevSiblingThought.id)) : pathParent
}

export default prevThought
