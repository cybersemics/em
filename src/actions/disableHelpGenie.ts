import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/**
 * Marks the help genie as unable to run on this device, for the rest of the session, and puts it back. Dispatched
 * when the genie fails to start: no WebGL, its code fails to download, or it throws while rendering.
 */
const disableHelpGenie = (state: State): State => ({
  ...state,
  helpGenie: { ...state.helpGenie, visible: false, unavailable: true },
})

/** Action-creator for disableHelpGenie. */
export const disableHelpGenieActionCreator = (): Thunk => dispatch => dispatch({ type: 'disableHelpGenie' })

export default disableHelpGenie

// Register this action's metadata
registerActionMetadata('disableHelpGenie', {
  undoable: false,
})
