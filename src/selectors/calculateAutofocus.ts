import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { MAX_DISTANCE_FROM_CURSOR } from '../constants'
import checkIfPathShareSubcontext from '../util/checkIfPathShareSubcontext'
import head from '../util/head'
import isRoot from '../util/isRoot'
import once from '../util/once'
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

  if (isRoot(simplePath)) return 'show'

  const depth = simplePath.length
  const estimatedDistance = state.cursor
    ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, state.cursor.length - depth!))
    : 0
  const isCursorLeaf = state.cursor && hasChildren(state, head(state.cursor))

  const maxDistance = MAX_DISTANCE_FROM_CURSOR - (isCursorLeaf ? 1 : 2)

  // first visible thought at the top
  const firstVisiblePath =
    state.expandHoverTopPath ||
    (state.cursor && state.cursor.length - maxDistance > 0 ? (state.cursor.slice(0, -maxDistance) as Path) : null)

  // const resolvedPath = path ?? simplePath
  const resolvedPath = simplePath

  const cursorSubthoughtIndex = once(() => (state.cursor ? checkIfPathShareSubcontext(state.cursor, resolvedPath) : -1))

  const isAncestorOfCursor =
    state.cursor && state.cursor.length > resolvedPath.length && resolvedPath.length === cursorSubthoughtIndex() + 1

  const isDescendantOfFirstVisiblePath = once(
    () =>
      !firstVisiblePath ||
      isRoot(firstVisiblePath) ||
      (firstVisiblePath.length < resolvedPath.length &&
        firstVisiblePath.every((value, i) => resolvedPath[i] === value)),
  )

  const isCursor =
    state.cursor && resolvedPath.length === cursorSubthoughtIndex() + 1 && resolvedPath.length === state.cursor?.length

  /** Returns true if the resolvedPath is a descendant of the state.cursor. */
  const isDescendantOfCursor = () =>
    state.cursor && resolvedPath.length > state.cursor.length && state.cursor.length === cursorSubthoughtIndex() + 1

  // thoughts that are not the ancestor of state.cursor or the descendants of first visible thought should be shifted left and hidden.
  const hide = !isAncestorOfCursor && !isDescendantOfFirstVisiblePath()

  const isCursorParent = state.cursor && isAncestorOfCursor && state.cursor.length - resolvedPath.length === 1

  /** Returns true if the children should be dimmed by the autofocus. */
  const dim = () =>
    state.cursor &&
    !isCursor &&
    isDescendantOfFirstVisiblePath() &&
    !(isCursorParent && isCursorLeaf) &&
    !isDescendantOfCursor()

  const actualDistance = hide /* || zoom */ ? 2 : dim() ? 1 : estimatedDistance

  return actualDistance === 0 ? 'show' : actualDistance === 1 ? 'dim' : actualDistance === 2 ? 'hide' : 'hide-parent'
}

export default calculateAutofocus
