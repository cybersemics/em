import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import equalPath from '../util/equalPath'
import head from '../util/head'
import { isDescendantPath } from '../util/isDescendantPath'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import { hasChildren } from './getChildren'

/** Calculates whether a thought is shown, hidden, or dimmed based on the position of the cursor. */
const calculateAutofocus = (state: State, simplePath: SimplePath) => {
  /* Note:

  # Thoughts that should not be dimmed
    - Cursor and its descendants.
    - Thoughts that are both descendant of the first visible thought and ancestor of the cursor.
    - Siblings of the cursor if the cursor is a leaf thought.

  # Thoughts that should be dimmed
    - first visible thought should be dimmed if it is not direct parent of the cursor.
    - Besides the above mentioned thoughts in the above "should not dim section", all the other thoughts that are descendants of the first visible thought should be dimmed.

  Note: `hide` and `dim` needs to be calculated here because autofocus implementation takes only depth into account. But some thoughts needs to be shifted, hidden or dimmed due to their position relative to the cursor.

  */

  if (!state.cursor || isRoot(simplePath)) return 'show'

  // const resolvedPath = path ?? simplePath
  const resolvedPath = simplePath as Path

  /** Returns true if the thought is the parent of the cursor. */
  const isCursorParent = () => equalPath(parentOf(state.cursor!), resolvedPath)

  /** Returns true if the thought is a sibling of the cursor. */
  const isCursorSibling = () => equalPath(parentOf(state.cursor!), parentOf(resolvedPath))

  const isCursorLeaf = !hasChildren(state, head(state.cursor))

  /** Returns true if the resolvedPath is a descendant of the state.cursor. */
  const isDescendantOfCursor = () => isDescendantPath(resolvedPath, state.cursor)
  // state.cursor && resolvedPath.length > state.cursor.length && state.cursor.length === cursorSubthoughtIndex() + 1

  // const isAncestor = () => isDescendantPath(state.cursor, resolvedPath)
  const distance = state.cursor.length - resolvedPath.length

  return ((isCursorParent() || isCursorSibling()) && isCursorLeaf) || isDescendantOfCursor()
    ? 'show'
    : distance < (isCursorLeaf ? 3 : 2)
    ? 'dim'
    : 'hide'
}

export default calculateAutofocus
