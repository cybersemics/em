import State from '../@types/State'
import Thunk from '../@types/Thunk'
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
export const unpinCommandActionCreator = (): Thunk => dispatch => dispatch({ type: 'unpinCommand' })

export default unpinCommand

// Pin selection is not an edit, so it must not participate in undo history.
registerActionMetadata('unpinCommand', {
  undoable: false,
})
