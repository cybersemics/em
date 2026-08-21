import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isDescendantPath from '../util/isDescendantPath'
import isRoot from '../util/isRoot'
import attributeEquals from './attributeEquals'
import findDescendant from './findDescendant'
import { hasChildren } from './getChildren'
import rootedParentOf from './rootedParentOf'

/** Returns the deepest ancestor-or-self of the cursor that has =focus/Zoom set, or null if the cursor is not zoomed. Zoom may be set on the thought itself (=focus/Zoom) or on all of its siblings via its parent (=children/=focus/Zoom). */
const zoomPath = (state: State): Path | null => {
  if (!state.cursor) return null
  // Walk up from the cursor so that the innermost zoom wins when zooms are nested.
  for (let i = state.cursor.length; i > 0; i--) {
    const path = state.cursor.slice(0, i) as Path
    const childrenAttributeId = findDescendant(state, head(rootedParentOf(state, path)), '=children')
    if (
      attributeEquals(state, head(path), '=focus', 'Zoom') ||
      attributeEquals(state, childrenAttributeId, '=focus', 'Zoom')
    )
      return path
  }
  return null
}

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

  // =focus/Zoom gives the zoomed thought the full screen by hiding everything outside its subtree, i.e. its parent, its siblings, and their descendants.
  const zoom = zoomPath(state)
  if (zoom && !isDescendantPath(path, zoom)) {
    // Ancestors of the cursor use 'hide-parent' so that they fade rather than snap in when navigating back up. See: VirtualThought.
    return isDescendantPath(state.cursor, path) ? 'hide-parent' : 'hide'
  }

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
  const isExpandedBottom = () => isDescendantPath(path, state.expandHoverDownPath ?? null)

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
