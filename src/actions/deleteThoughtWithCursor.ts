import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import deleteThought from '../actions/deleteThought'
import { ABSOLUTE_TOKEN } from '../constants'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import hashPath from '../util/hashPath'
import head from '../util/head'
import headValue from '../util/headValue'
import once from '../util/once'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import updateCursorAfterDelete from './updateCursorAfterDelete'

/** Given a path to a thought within the context view (a/m~/b), find the associated thought (b/m). This is nontrivial since the associated thought (b/m) is a different Lexeme instance than the context view thought (a/m). */
const getContext = (state: State, path: Path) => {
  const contextValue = headValue(state, parentOf(path))
  const contexts = contextValue !== undefined ? getContexts(state, contextValue) : []
  return contexts.find(cxid => getThoughtById(state, cxid)?.parentId === head(path))
}

/** Deletes a thought and moves the cursor to a nearby valid thought. Works in normal view and context view. */
const deleteThoughtWithCursor = (state: State) => {
  if (!state.cursor) return state

  const cursor = state.cursor
  const parentPath = rootedParentOf(state, cursor)

  // same as in newThought
  const showContexts = isContextViewActive(state, parentPath)
  const simplePath = thoughtToPath(state, head(cursor))

  const thought = getThoughtById(state, head(simplePath))

  if (!thought) return state

  /** Returns true if the context view needs to be closed after deleting . Specifically, returns true if there is only one context left after the delete or if the deleted cursor is a cyclic context, e.g. a/m~/a. */
  const shouldCloseContextView = once(() => {
    const parentPath = rootedParentOf(state, cursor)
    const showContexts = isContextViewActive(state, parentPath)
    const parentThought = getThoughtById(state, head(parentPath))
    const numContexts = showContexts && parentThought ? getContexts(state, parentThought.value).length : 0
    const isCyclic = head(cursor) === head(parentOf(parentOf(cursor)))
    return isCyclic || numContexts <= 2
  })

  // When deleting a context from the context view, we need to delete the correct instance of the Lexeme, e.g. in a/m~/b we want to delete b/m
  // This is a problem specifically for tangential contexts, which have a different parent from the cursor.
  // i.e. The id of b/m is not contained within the cursor a/m~/b because they are different m instances.
  const contextId = (showContexts && getContext(state, cursor)) || null

  return reducerFlow([
    // delete thought
    deleteThought(
      // If the context is in the ABSOLUTE context, then use the normal deletion logic to delete the context instance as well, i.e. delete ABS/one, not just ABS/one/m
      // TODO: Wouldn't this remove other children in ABS/one?
      showContexts && thought.parentId !== ABSOLUTE_TOKEN
        ? {
            pathParent: cursor,
            thoughtId: contextId!,
          }
        : {
            pathParent: parentPath,
            thoughtId: head(simplePath),
          },
    ),

    // move cursor
    stateNew => updateCursorAfterDelete(stateNew, state),

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
export const deleteThoughtWithCursorActionCreator = (): Thunk => dispatch =>
  dispatch({ type: 'deleteThoughtWithCursor' })

export default deleteThoughtWithCursor

// Register this action's metadata
registerActionMetadata('deleteThoughtWithCursor', {
  undoable: true,
})
