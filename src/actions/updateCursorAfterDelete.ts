import { applyPatch } from 'fast-json-patch'
import Path from '../@types/Path'
import State from '../@types/State'
import cursorBack from '../actions/cursorBack'
import setCursor from '../actions/setCursor'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import nextContext from '../selectors/nextContext'
import nextSibling from '../selectors/nextSibling'
import prevContext from '../selectors/prevContext'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import headValue from '../util/headValue'
import once from '../util/once'
import parentOf from '../util/parentOf'

/** Update the cursor after it has been deleted.
 * - Sets the cursor on the next sibling, previous sibling, or parent, in that order.
 * - Handles context view.
 * - Special case for New (Sub)Thought:
 * -   If the last action was newThought (above), restore the cursor to the next thought rather than the previous.
 * -   If the last action was a new subthought, i.e. newThought with insertNewSubthought: true, restore the cursor to the parent.
 * -   Restoring the cursor and making the delete action an exact inverse to newThought is more intuitive than moving the cursor elsewhere, and helps the user with error correction.
 **/
const updateCursorAfterDelete = (state: State, statePrev: State) => {
  const cursor = statePrev.cursor
  if (!cursor) return state

  const parentPath = rootedParentOf(statePrev, cursor)
  const showContexts = isContextViewActive(statePrev, parentPath)
  const simplePath = thoughtToPath(statePrev, head(cursor))

  const thought = getThoughtById(statePrev, head(simplePath))

  if (!thought) return state

  /** Returns true if the context view needs to be closed after deleting. Specifically, returns true if there is only one context left after the delete or if the deleted path is a cyclic context, e.g. a/m~/a. */
  const shouldCloseContextView = once(() => {
    const parentPath = rootedParentOf(statePrev, cursor)
    const showContexts = isContextViewActive(statePrev, parentPath)
    const parentThought = getThoughtById(statePrev, head(parentPath))
    const numContexts = showContexts && parentThought ? getContexts(statePrev, parentThought.value).length : 0
    const isCyclic = head(cursor) === head(parentOf(parentOf(cursor)))
    return isCyclic || numContexts <= 2
  })

  // prev and next must be calculated before dispatching deleteThought
  const prev = once(() =>
    showContexts
      ? // In context view, do not set cursor on next/prev context if cyclic context was deleted, i.e. If a/m~/b was deleted, do not try to set the cursor on a/m~/a, since a/m no longer exists.
        // If there is only one context left in the context view after deletion, do not set the cursor on the next/prev context, but instead allow it to fall back to the parent since the context view will be collapsed.
        !shouldCloseContextView()
        ? prevContext(statePrev, cursor)
        : null
      : // If context view is not enabled, get the prev thought in normal view. We need to explicitly override showContexts, otherwise prevSibling will infer that the context view is enabled and will incorrectly return the previous context.
        prevSibling(statePrev, simplePath, { showContexts: false }),
  )

  const next = once(() =>
    showContexts
      ? !shouldCloseContextView()
        ? nextContext(statePrev, cursor)
        : null
      : nextSibling(statePrev, simplePath),
  )

  // instead of using the thought parent, use the closest valid ancestor
  // otherwise deleting a thought from a cyclic context will return an invalid cursor
  const pathParent = rootedParentOf(state, cursor)
  const missingIndex = pathParent.findIndex(id => !getThoughtById(state, id))
  const closestAncestor = missingIndex !== -1 ? (pathParent.slice(0, missingIndex) as Path) : pathParent

  // If the last action was newThought (above), restore the cursor to the next thought rather than the previous.
  // If the last action was a new subthought, i.e. newThought with insertNewSubthought: true, restore the cursor to the parent.
  // Restoring the cursor and making the delete action an exact inverse to newThought is more intuitive than moving the cursor elsewhere, and helps the user with error correction.
  const revertedCursor = once(() => {
    // check cursor prior to deleteThought, not state.cursor
    if (!cursor) return null

    const lastPatches = state.undoPatches[state.undoPatches.length - 1]
    const lastCursorOps = lastPatches?.filter(
      patch => patch.actions[0] === 'newThought' && patch.path.startsWith('/cursor/'),
    )

    if (!lastCursorOps || lastCursorOps.length === 0) return null

    // remove /cursor from the patch since we are applying it directly to cursor, not the full state
    const revertCursorPatch = lastCursorOps.map(patch => ({
      op: patch.op,
      path: patch.path.replace('/cursor', ''),
      value: patch.value,
    }))
    // apply to the cursor prior to deleteThought, not state.cursor
    const cursorNew = applyPatch([...cursor], revertCursorPatch).newDocument as Path
    return cursorNew
  })

  const cursorNew = revertedCursor()
    ? revertedCursor()
    : // Case I: Set cursor on next thought.
      // Do not move the cursor to the next thought after deleting an empty thought, as it is more intuitive to move the cursor to the previous thought like a word processor.
      // this does not apply to context view or when there is a reverted cursor
      thought.value !== '' && next()
      ? appendToPath(parentOf(cursor), next()!.id)
      : // Case II: Set cursor on prev thought.
        // For empty thoughts, we need to fall back to next().
        // Allow revertNewSubthought to fall through to Case III (parent).
        prev() || next()
        ? appendToPath(closestAncestor, (prev() || next())!.id)
        : // Case III: delete last thought in context; set cursor on parent
          // if showContexts falls through here, it means either the last context was deleted or a cyclic context was deleted
          showContexts || simplePath.length > 1
          ? closestAncestor
          : // Case IV: Delete last thought in thoughtspace; remove cursor.
            null

  return cursorNew
    ? setCursor(state, {
        path: cursorNew,
        editing: state.editing,
        offset: next() ? 0 : headValue(state, cursorNew)?.length,
      })
    : cursorBack(state)
}

export default updateCursorAfterDelete
