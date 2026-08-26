import { applyPatch } from 'fast-json-patch'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import cursorBack from '../actions/cursorBack'
import setCursor from '../actions/setCursor'
import contextThoughtId from '../selectors/contextThoughtId'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import nextContext from '../selectors/nextContext'
import nextSibling from '../selectors/nextSibling'
import pathToThought from '../selectors/pathToThought'
import prevContext from '../selectors/prevContext'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import headId from '../util/headId'
import headValue from '../util/headValue'
import once from '../util/once'
import parentOf from '../util/parentOf'
import { isContextStep, pathIds, replaceHead } from '../util/pathStep'

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
  // the head step records whether this position was reached by crossing a context view
  const showContexts = isContextStep(head(cursor))
  const simplePath = simplifyPath(statePrev, cursor)

  // the thought the user saw at the cursor, i.e. the context rather than the Lexeme instance in the context view
  const thought = pathToThought(statePrev, cursor)

  if (!thought) return state

  /** Returns true if the context view needs to be closed after deleting. Specifically, returns true if there is only one context left after the delete or if the deleted path is a cyclic context, e.g. a/m~/a. */
  const shouldCloseContextView = once(() => {
    const contextViewThought = getThoughtById(statePrev, contextThoughtId(statePrev, parentPath))
    const numContexts = showContexts && contextViewThought ? getContexts(statePrev, contextViewThought.value).length : 0
    // a cyclic context is one whose context is the grandparent, e.g. a/m~/a
    const isCyclic =
      cursor.length > 2 && contextThoughtId(statePrev, cursor) === headId(parentOf(parentOf(cursor)) as Path)
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
      : // prevSibling reads the context view off the path's own head step, which is an ordinary child step here, so it
        // resolves in normal view without needing to be told
        prevSibling(statePrev, cursor),
  )

  const next = once(() =>
    showContexts ? (!shouldCloseContextView() ? nextContext(statePrev, cursor) : null) : nextSibling(statePrev, cursor),
  )

  // instead of using the thought parent, use the closest valid ancestor
  // otherwise deleting a thought from a cyclic context will return an invalid cursor
  const pathParent = rootedParentOf(state, cursor)
  const missingIndex = pathIds(pathParent).findIndex(id => !getThoughtById(state, id))
  const closestAncestor = missingIndex !== -1 ? (pathParent.slice(0, missingIndex) as Path) : pathParent

  /** Builds the Path of a sibling of the deleted thought. When the closest valid ancestor is still the cursor's parent, the sibling is reached the same way the cursor was — which in the context view means crossing the context view. Otherwise the context-view row is gone along with its ancestor, and the sibling is an ordinary child. */
  const siblingPath = (id: ThoughtId): Path =>
    closestAncestor.length === cursor.length - 1 ? replaceHead(cursor, id) : appendToPath(closestAncestor, id)

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
      ? replaceHead(cursor, next()!.id)
      : // Case II: Set cursor on prev thought.
        // For empty thoughts, we need to fall back to next().
        // Allow revertNewSubthought to fall through to Case III (parent).
        prev() || next()
        ? siblingPath((prev() || next())!.id)
        : // Case III: delete last thought in context; set cursor on parent
          // if showContexts falls through here, it means either the last context was deleted or a cyclic context was deleted
          showContexts || simplePath.length > 1
          ? closestAncestor
          : // Case IV: Delete last thought in thoughtspace; remove cursor.
            null

  return cursorNew
    ? setCursor(state, {
        path: cursorNew,
        isKeyboardOpen: state.isKeyboardOpen,
        // If there is no next thought, or when deleting an empty thought, set the offset to the end of the previous thought.
        // Otherwise, set the offset to the beginning of the thought.
        offset: !next() || (thought.value === '' && prev()) ? headValue(state, cursorNew)?.length : 0,
      })
    : cursorBack(state)
}

export default updateCursorAfterDelete
