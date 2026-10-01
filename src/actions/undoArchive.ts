import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import deleteThought from '../actions/deleteThought'
import moveThought from '../actions/moveThought'
import setCursor from '../actions/setCursor'
import { getAllChildren } from '../selectors/getChildren'
import getFirstChildPlacement from '../selectors/getFirstChildPlacement'
import rootedParentOf from '../selectors/rootedParentOf'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'

/** Moves the archived thought back to its original location. */
const undoArchive = (
  state: State,
  { originalPath, currPath, offset }: { originalPath: Path; currPath: Path; offset?: number },
  transaction?: ThoughtspaceTransaction,
) => {
  const parentId = head(rootedParentOf(state, currPath))
  const originalParentId = head(rootedParentOf(state, originalPath))

  return reducerFlow([
    // set the cursor to the original path before restoring the thought
    state =>
      setCursor(
        state,
        {
          path: originalPath,
          isKeyboardOpen: state.isKeyboardOpen,
          offset,
        },
        transaction,
      ),

    // move thought out of archive
    moveThought({
      oldPath: currPath,
      newPath: originalPath,
      offset,
      afterId: getFirstChildPlacement(state, originalParentId),
    }),

    // delete =archive if empty
    state =>
      getAllChildren(state, parentId).length === 0
        ? deleteThought(
            state,
            {
              pathParent: rootedParentOf(state, originalPath),
              thoughtId: parentId,
            },
            transaction,
          )
        : state,

    // hide the undo alert
    alert({ value: null }),
  ])(state, transaction)
}

/** Action-creator for undoArchive. */
export const undoArchiveActionCreator =
  (payload: Parameters<typeof undoArchive>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'undoArchive', ...payload })

export default command(undoArchive)

// Register this action's metadata
registerActionMetadata('undoArchive', {
  undoable: false,
})
