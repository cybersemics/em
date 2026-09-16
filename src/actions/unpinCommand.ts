import State from '../@types/State'
import Thunk from '../@types/Thunk'
import learningStorage from '../data-providers/learningStorage'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Clears the pinned command. All practice progress is retained so that repinning restores it. */
const unpinCommand = (state: State): State => ({
  ...state,
  learning: {
    ...state.learning,
    pinnedCommandId: null,
  },
})

/** Action-creator for unpinCommand. */
export const unpinCommandActionCreator = (): Thunk => (dispatch, getState) => {
  dispatch({ type: 'unpinCommand' })
  learningStorage.save(getState().learning)
}

export default unpinCommand

// Pin selection is not an edit, so it must not participate in undo history.
registerActionMetadata('unpinCommand', {
  undoable: false,
})
