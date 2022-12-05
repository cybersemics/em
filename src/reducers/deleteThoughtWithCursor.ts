import { applyPatch } from 'fast-json-patch'
import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import { ABSOLUTE_TOKEN } from '../constants'
import cursorBack from '../reducers/cursorBack'
import deleteThought from '../reducers/deleteThought'
import setCursor from '../reducers/setCursor'
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
import reducerFlow from '../util/reducerFlow'

/** Given a path to a thought within the context view (a/m~/b), find the associated thought (b/m). This is nontrivial since the associated thought (b/m) is a different Lexeme instance than the context view thought (a/m). */
const getContext = (state: State, path: Path) =>
  getContexts(state, headValue(state, parentOf(path))).find(
    cxid => getThoughtById(state, cxid)?.parentId === head(path),
  )

/** Returns true if a path is a cyclic context, e.g. a/m~/a. */
const isCyclic = (state: State, path: Path) => head(path) === head(parentOf(parentOf(path)))

/** Deletes a thought and moves the cursor to a nearby valid thought. Works in normal view and context view. */
const deleteThoughtWithCursor = (state: State, payload: { path?: Path }) => {
  if (!state.cursor && !payload.path) return state

  const cursor = state.cursor
  const path = (payload.path || cursor)! // eslint-disable-line fp/no-let
  const parentPath = rootedParentOf(state, path)

  // same as in newThought
  const showContexts = isContextViewActive(state, parentPath)
  const numContexts = showContexts ? getContexts(state, getThoughtById(state, head(parentPath)).value).length : 0
  const simplePath = thoughtToPath(state, head(path))

  const thought = getThoughtById(state, head(simplePath))

  // prev and next must be calculated before dispatching deleteThought
  const prev = once(() =>
    showContexts
      ? // In context view, do not set cursor on next/prev context if cyclic context was deleted, i.e. If a/m~/a was deleted, do not try to set the cursor on a/m~/b, since a/m no longer exists.
        // If there is only one context left in the context view after deletion, do not set the cursor on the next/prev context, but instead allow it to fall back to the parent since the context view should be collapsed.
        !isCyclic(state, path) && numContexts > 2
        ? prevContext(state, path)
        : null
      : prevSibling(state, simplePath),
  )
  const next = once(() =>
    showContexts
      ? !isCyclic(state, path) && numContexts > 2
        ? nextContext(state, path)
        : null
      : // never move the cursor to the next thought after deleting an empty thought, as it is more intuitive to move the cursor to the previous thought like a word processor
      // this does not apply to context view or when there is a reverted cursor
      thought.value !== ''
      ? nextSibling(state, simplePath)
      : null,
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
            pathParent: simplePath,
            thoughtId: contextId!,
          }
        : {
            pathParent: parentOf(simplePath),
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
        : // Case I: set cursor on next thought
        next()
        ? appendToPath(parentOf(path), next()!.id)
        : // Case II: set cursor on first thought
        // allow revertNewSubthought to fall through to Case III (parent)
        prev()
        ? appendToPath(closestAncestor, prev()!.id)
        : // Case III: delete last thought in context; set cursor on parent
        // if showContexts falls through here, it means either the last context was deleted or a cyclic context was deleted
        showContexts || simplePath.length > 1
        ? closestAncestor
        : // Case IV: delete last thought in thoughtspace; remove cursor
          null

      return cursorNew
        ? setCursor(state, {
            path: cursorNew,
            editing: state.editing,
            offset: next() ? 0 : headValue(state, cursorNew).length,
          })
        : cursorBack(state)
    },
  ])(state)
}

export default _.curryRight(deleteThoughtWithCursor)
