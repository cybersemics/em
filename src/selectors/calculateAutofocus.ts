import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isDescendantPath from '../util/isDescendantPath'
import isRoot from '../util/isRoot'
import { hasChildren } from './getChildren'
import rootedParentOf from './rootedParentOf'

/** Calculates whether a thought is shown, hidden, or dimmed based on the position of the cursor. */
const calculateAutofocus = (state: State, path: Path) => {
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

  if (!state.cursor || isRoot(path)) return 'show'

  const cursorParent = rootedParentOf(state, state.cursor!)
  const cursorGrandparent = rootedParentOf(state, cursorParent)

  // Generally if the cursor is on a leaf, the autofocus should be the same as its parent.
  // This avoids a visual shift when there are no additional descendants to focus on.
  const isCursorLeaf = !hasChildren(state, head(state.cursor))

  /** Returns true if the thought is the parent or sibling of the cursor. */
  const isParentOrSibling = () => equalPath(cursorParent, path) || equalPath(cursorParent, rootedParentOf(state, path))

  /** Returns true if the thought is the grandparent of the cursor. */
  const isGrandparent = () => equalPath(cursorGrandparent, path)

  /** Returns true if the thought is the parent of the cursor. */
  const isUncle = () => equalPath(cursorGrandparent, rootedParentOf(state, path))

  /** Returns true if the thought is a descendant of the cursor. */
  const isDescendantOfCursor = () => isDescendantPath(path, state.cursor)

  /** Returns true if the thought is a descendant of an uncle of the cursor. */
  const isDescendantOfUncle = () => isDescendantPath(path, cursorParent)

  /** Returns true if the thought is a descendant of an uncle of the cursor. */
  const isDescendantOfGreatUncle = () => isDescendantPath(path, cursorGrandparent)

  /** Returns true if the thought is expanded by hovering above the first visible thought. */
  const isExpandedTop = () =>
    !!state.expandHoverUpPath &&
    (isRoot(state.expandHoverUpPath) || isDescendantPath(path, state.expandHoverUpPath || null))

  /** Returns true if the thought is expanded by hovering below a thought. */
  const isExpandedBottom = () =>
    Object.values(state.expandHoverDownPaths).some(bottomPath => isDescendantPath(path, bottomPath || null))

  return (isCursorLeaf && isParentOrSibling()) || isDescendantOfCursor()
    ? 'show'
    : isParentOrSibling() ||
        isDescendantOfUncle() ||
        (isCursorLeaf && isGrandparent()) ||
        (isCursorLeaf && isUncle()) ||
        (isCursorLeaf && isDescendantOfGreatUncle()) ||
        isExpandedBottom() ||
        isExpandedTop()
      ? 'dim'
      : isGrandparent() || isUncle()
        ? 'hide-parent'
        : 'hide'
}

export default _.curryRight(calculateAutofocus)
