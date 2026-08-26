import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import deleteThought from '../actions/deleteThought'
import { ABSOLUTE_TOKEN } from '../constants'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import parentContextId from '../selectors/parentContextId'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import hashPath from '../util/hashPath'
import head from '../util/head'
import headId from '../util/headId'
import once from '../util/once'
import parentOf from '../util/parentOf'
import { isContextStep } from '../util/pathStep'
import reducerFlow from '../util/reducerFlow'
import updateCursorAfterDelete from './updateCursorAfterDelete'

/** Deletes a thought and moves the cursor to a nearby valid thought. Works in normal view and context view. */
const deleteThoughtWithCursor = (state: State): State => {
  if (!state.cursor) return state

  const cursor = state.cursor
  const parentPath = rootedParentOf(state, cursor)

  // The head step records whether this position was reached by crossing a context view.
  const showContexts = isContextStep(head(cursor))

  // In the context view the cursor a/m~/b displays the context b but stands for the Lexeme context b/m, which is the
  // thought that has to be deleted. The step records it directly, so there is no Lexeme scan to do.
  const lexemeContextId = headId(cursor)
  const thought = pathToThought(state, cursor)

  if (!thought) return state

  /** Returns true if the context view needs to be closed after deleting . Specifically, returns true if there is only one context left after the delete or if the deleted cursor is a cyclic context, e.g. a/m~/a. */
  const shouldCloseContextView = once(() => {
    const contextViewThought = getThoughtById(state, parentContextId(state, parentPath))
    const numContexts = showContexts && contextViewThought ? getContexts(state, contextViewThought.value).length : 0
    // a cyclic context is one whose context is the grandparent, e.g. a/m~/a
    const isCyclic = cursor.length > 2 && parentContextId(state, cursor) === headId(parentOf(parentOf(cursor)) as Path)
    return isCyclic || numContexts <= 2
  })

  return reducerFlow([
    // delete thought
    deleteThought(
      // If the context is in the ABSOLUTE context, then use the normal deletion logic to delete the context instance as well, i.e. delete ABS/one, not just ABS/one/m
      // TODO: Wouldn't this remove other children in ABS/one?
      showContexts && thought.parentId !== ABSOLUTE_TOKEN
        ? {
            pathParent: cursor,
            thoughtId: lexemeContextId,
          }
        : {
            pathParent: parentPath,
            // the displayed thought: in the ABSOLUTE case that is the empty context itself (ABS/_), which is deleted
            // along with the Lexeme context inside it. In normal view the two are the same thought.
            thoughtId: thought.id,
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
