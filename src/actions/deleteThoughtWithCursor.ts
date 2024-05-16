import { applyPatch } from 'fast-json-patch'
import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import cursorBack from '../actions/cursorBack'
import deleteThought from '../actions/deleteThought'
import setCursor from '../actions/setCursor'
import { ABSOLUTE_TOKEN } from '../constants'
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
import hashPath from '../util/hashPath'
import head from '../util/head'
import headValue from '../util/headValue'
import once from '../util/once'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'

/** Given a path to a thought within the context view (a/m~/b), find the associated thought (b/m). This is nontrivial since the associated thought (b/m) is a different Lexeme instance than the context view thought (a/m). */
const getContext = (state: State, path: Path) =>
  getContexts(state, headValue(state, parentOf(path))).find(
    cxid => getThoughtById(state, cxid)?.parentId === head(path),
  )

/** Deletes a thought and moves the cursor to a nearby valid thought. Works in normal view and context view. */
const deleteThoughtWithCursor = (state: State, payload: { path?: Path }) => {
  if (!state.cursor && !payload.path) return state

  const cursor = state.cursor
  const path = (payload.path || cursor)!
  const parentPath = rootedParentOf(state, path)

  // same as in newThought
  const showContexts = isContextViewActive(state, parentPath)
  const simplePath = thoughtToPath(state, head(path))

  const thought = getThoughtById(state, head(simplePath))

  /** Returns true if the context view needs to be closed after deleting . Specifically, returns true if there is only one context left after the delete or if the deleted path is a cyclic context, e.g. a/m~/a. */
  const shouldCloseContextView = once(() => {
    const parentPath = rootedParentOf(state, path)
    const showContexts = isContextViewActive(state, parentPath)
    const numContexts = showContexts ? getContexts(state, getThoughtById(state, head(parentPath)).value).length : 0
    const isCyclic = head(path) === head(parentOf(parentOf(path)))
    return isCyclic || numContexts <= 2
  })

  // prev and next must be calculated before dispatching deleteThought
  const prev = once(() =>
    showContexts
      ? // In context view, do not set cursor on next/prev context if cyclic context was deleted, i.e. If a/m~/b was deleted, do not try to set the cursor on a/m~/a, since a/m no longer exists.
        // If there is only one context left in the context view after deletion, do not set the cursor on the next/prev context, but instead allow it to fall back to the parent since the context view will be collapsed.
        !shouldCloseContextView()
        ? prevContext(state, path)
        : null
      : // If context view is not enabled, get the prev thought in normal view. We need to explicitly override showContexts, otherwise prevSibling will infer that the context view is enabled and will incorrectly return the previous context.
        prevSibling(state, simplePath, { showContexts: false }),
  )

  const next = once(() =>
    showContexts ? (!shouldCloseContextView() ? nextContext(state, path) : null) : nextSibling(state, simplePath),
  )

  // When deleting a context from the context view, we need to delete the correct instance of the Lexeme, e.g. in a/m~/b we want to delete b/m
  // This is a problem specifically for tangential contexts, which have a different parent from the cursor.
  // i.e. The id of b/m is not contained within the cursor a/m~/b because they are different m instances.
  const contextId = (showContexts && getContext(state, path)) || null

  return reducerFlow([
    // delete thought
    deleteThought(
      // If the context is in the ABSOLUTE context, then use the normal deletion logic to delete the context instance as well, i.e. delete ABS/one, not just ABS/one/m
      // TODO: Wouldn't this remove other children in ABS/one?
      showContexts && thought.parentId !== ABSOLUTE_TOKEN
        ? {
            pathParent: path,
            thoughtId: contextId!,
          }
        : {
            pathParent: parentPath,
            thoughtId: head(simplePath),
          },
    ),

    // move cursor
    state => {
      // instead of using the thought parent, use the closest valid ancestor
      // otherwise deleting a thought from a cyclic context will return an invalid cursor
      const pathParent = rootedParentOf(state, path)
      const missingIndex = pathParent.findIndex(id => !getThoughtById(state, id))
      const closestAncestor = missingIndex !== -1 ? (pathParent.slice(0, missingIndex) as Path) : pathParent

      // If the last action was newThought (above), restore the cursor to the next thought rather than the previous.
      // If the last action was a new subthought, i.e. newThought with insertNewSubthought: true, restore the cursor to the parent.
      // Restoring thec ursor and making the delete action an exact inverse to newThought is more intuitive than moving the cursor elsewhere, and helps the user with error correction.
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
          ? appendToPath(parentOf(path), next()!.id)
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
            offset: next() ? 0 : headValue(state, cursorNew).length,
          })
        : cursorBack(state)
    },

    /* If the second-to-last context is deleted, and it is a tangential context, we need to manually close the context view.
       Other cases are handled by deleteThought.

      e.g. Activate the context view on a/m and delete a/m~/b/m`

        - a
          - m
        - b
          - m
    */
    shouldCloseContextView()
      ? state => {
          const contextViewsNew = { ...state.contextViews }
          delete contextViewsNew[hashPath(parentPath)]
          return {
            contextViews: contextViewsNew,
          }
        }
      : null,
  ])(state)
}

/** Action-creator for deleteThoughtWithCursor. */
export const deleteThoughtWithCursorActionCreator =
  (payload: Parameters<typeof deleteThoughtWithCursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'deleteThoughtWithCursor', ...payload })

export default _.curryRight(deleteThoughtWithCursor) /** Action-creator for deleteThoughtWithCursor. */
