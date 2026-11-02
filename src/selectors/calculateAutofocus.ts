import Autofocus from '../@types/Autofocus'
import Path from '../@types/Path'
import State from '../@types/State'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isDescendantPath from '../util/isDescendantPath'
import isRoot from '../util/isRoot'
import { hasChildren } from './getChildren'
import rootedParentOf from './rootedParentOf'
import zoomPath from './zoomPath'

/** Prepares autofocus calculations for paths in one synchronous traversal of the current tree. */
const calculateAutofocus = (state: State): ((path: Path) => Autofocus) => {
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

  if (!state.cursor) return () => 'show'

  // =focus/Zoom gives the zoomed thought the full screen by hiding everything outside its subtree, i.e. its parent, its siblings, and their descendants.
  const zoom = zoomPath(state)
  const cursorParent = rootedParentOf(state, state.cursor)
  const cursorGrandparent = rootedParentOf(state, cursorParent)

  // Generally if the cursor is on a leaf, the autofocus should be the same as its parent.
  // This avoids a visual shift when there are no additional descendants to focus on.
  const isCursorLeaf = !hasChildren(state, head(state.cursor))

  return (path: Path) => {
    if (isRoot(path)) return 'show'
    if (zoom && !isDescendantPath(path, zoom)) {
      // Ancestors of the cursor use 'hide-parent' so that they fade rather than snap in when navigating back up. See: VirtualThought.
      return isDescendantPath(state.cursor, path) ? 'hide-parent' : 'hide'
    }

    const parent = rootedParentOf(state, path)
    const isParentOrSibling = equalPath(cursorParent, path) || equalPath(cursorParent, parent)
    const isGrandparent = equalPath(cursorGrandparent, path)
    const isUncle = equalPath(cursorGrandparent, parent)

    return (isCursorLeaf && isParentOrSibling) || isDescendantPath(path, state.cursor)
      ? 'show'
      : isParentOrSibling ||
          isDescendantPath(path, cursorParent) ||
          (isCursorLeaf && isGrandparent) ||
          (isCursorLeaf && isUncle) ||
          (isCursorLeaf && isDescendantPath(path, cursorGrandparent)) ||
          isDescendantPath(path, state.expandHoverDownPath ?? null) ||
          (!!state.expandHoverUpPath &&
            (isRoot(state.expandHoverUpPath) || isDescendantPath(path, state.expandHoverUpPath)))
        ? 'dim'
        : isGrandparent || isUncle
          ? 'hide-parent'
          : 'hide'
  }
}

export default calculateAutofocus
