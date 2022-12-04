import { applyPatch } from 'fast-json-patch'
import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import { ABSOLUTE_TOKEN } from '../constants'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import cursorBack from '../reducers/cursorBack'
import deleteThought from '../reducers/deleteThought'
import setCursor from '../reducers/setCursor'
import getContexts from '../selectors/getContexts'
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import nextSibling from '../selectors/nextSibling'
import nextThought from '../selectors/nextThought'
import parentOfThought from '../selectors/parentOfThought'
import pathToThought from '../selectors/pathToThought'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import thoughtsEditingFromChain from '../selectors/thoughtsEditingFromChain'
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

/** Deletes a thought and moves the cursor to a nearby valid thought. */
const deleteThoughtWithCursor = (state: State, payload: { path?: Path }) => {
  if (!state.cursor && !payload.path) return state

  const path = (payload.path || state.cursor)! // eslint-disable-line fp/no-let
  const parentPath = rootedParentOf(state, path)

  // same as in newThought
  const showContexts = isContextViewActive(state, parentPath)
  const simplePath = thoughtToPath(state, head(path))

  const thought = getThoughtById(state, head(simplePath))

  /** Calculates the previous context within a context view. */
  // TODO: Refactor into prevThought (cf nextThought)
  const prevContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(state, simplePath)
    const contexts = getContextsSortedAndRanked(state, headValue(state, thoughtsContextView))
    const removedThoughtIndex = contexts.findIndex(({ id }) => {
      const parentThought = parentOfThought(state, id)
      return parentThought?.value === thought.value
    })
    return contexts[removedThoughtIndex - 1]
  }

  // prev and next must be calculated before dispatching deleteThought
  const prev = showContexts ? prevContext() : prevSibling(state, simplePath)
  const nextContextPath = showContexts && getContexts(state, thought.value).length > 2 ? nextThought(state) : null
  const next = nextContextPath ? pathToThought(state, nextContextPath) : nextSibling(state, simplePath)

  /** Sets the cursor or moves it back if it doesn't exist. */
  const setCursorOrBack = (path: Path | null, { offset }: { offset?: number } = {}) =>
    path
      ? (state: State) =>
          setCursor(state, {
            path,
            editing: state.editing,
            offset,
          })
      : cursorBack

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
        if (!state.cursor) return null

        const lastPatches = state.undoPatches[state.undoPatches.length - 1]
        const lastCursorOps = lastPatches?.filter(
          patch => patch.actions[0] === 'newThought' && patch.path.startsWith('/cursor/'),
        )

        if (!lastCursorOps || lastCursorOps.length === 0) return null

        // remove /cursor from the patch since we are applying it directly to state.cursor, not the full state
        const revertCursorPatch = lastCursorOps.map(patch => ({
          op: patch.op,
          path: patch.path.replace('/cursor', ''),
          value: patch.value,
        }))
        const cursorNew = applyPatch([...state.cursor], revertCursorPatch).newDocument as Path
        return cursorNew
      })

      // Typescript validates with apply but not spread operator here
      // eslint-disable-next-line prefer-spread
      return setCursorOrBack.apply(
        null,
        revertedCursor()
          ? [revertedCursor(), { offset: getTextContentFromHTML(headValue(state, revertedCursor()!)).length }]
          : // Case I: set cursor on next thought
          // Do not set cursor on next context if cyclic context was deleted, i.e. If a/m~/a was deleted, do not try to set the cursor on a/m~/b, since a/m no longer exists
          next && (showContexts ? thought.id !== head(parentOf(parentOf(path))) : thought.value !== '')
          ? [appendToPath(parentOf(path), next.id)]
          : // Case II: set cursor on first thought
          // allow revertNewSubthought to fall through to Case III (parent)
          prev
          ? [appendToPath(closestAncestor, prev.id), { offset: prev.value.length }]
          : // Case III: delete last thought in context; set cursor on parent
          // if showContexts falls through here, it means either the last context was deleted or a cyclic context was deleted
          showContexts || simplePath.length > 1
          ? [closestAncestor, { offset: getTextContentFromHTML(thought.value).length }]
          : // Case IV: delete last thought in thoughtspace; remove cursor
            [null],
      )(state)
    },
  ])(state)
}

export default _.curryRight(deleteThoughtWithCursor)
