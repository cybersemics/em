import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Lets the help genie out, or puts it back. Pass value to set it explicitly. A genie that could not start stays in. */
const toggleHelpGenie = (state: State, { value }: { value?: boolean }): State => ({
  ...state,
  helpGenie: {
    ...state.helpGenie,
    visible: !state.helpGenie.unavailable && (value == null ? !state.helpGenie.visible : value),
  },
})

/** Action-creator for toggleHelpGenie. */
export const toggleHelpGenieActionCreator =
  (payload: Parameters<typeof toggleHelpGenie>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleHelpGenie', ...payload })

export default _.curryRight(toggleHelpGenie)

// Register this action's metadata
registerActionMetadata('toggleHelpGenie', {
  undoable: false,
})
