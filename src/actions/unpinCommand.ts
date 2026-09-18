import State from '../@types/State'
import Thunk from '../@types/Thunk'
import storageModel from '../stores/storageModel'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Clears the pinned command and erases its practice reps. Progress exists only while a command is pinned. */
const unpinCommand = (state: State): State => ({
  ...state,
  learning: {
    pinnedCommandId: null,
    progress: {},
  },
})

/** Action-creator for unpinCommand. */
export const unpinCommandActionCreator = (): Thunk => (dispatch, getState) => {
  dispatch({ type: 'unpinCommand' })
  storageModel.set('learning', getState().learning)
}

export default unpinCommand

// Pin selection is not an edit, so it must not participate in undo history.
registerActionMetadata('unpinCommand', {
  undoable: false,
})
