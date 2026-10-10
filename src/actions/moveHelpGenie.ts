import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/**
 * Sends the help genie to a point in the viewport, in CSS pixels. It flies there with its full effect, as it does when
 * following the pointer; whichever of the two moved last is where it goes. Does not let the genie out.
 */
const moveHelpGenie = (state: State, { x, y }: { x: number; y: number }): State => ({
  ...state,
  helpGenie: { ...state.helpGenie, target: { x, y } },
})

/** Action-creator for moveHelpGenie. */
export const moveHelpGenieActionCreator =
  (payload: Parameters<typeof moveHelpGenie>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'moveHelpGenie', ...payload })

export default _.curryRight(moveHelpGenie)

// Register this action's metadata
registerActionMetadata('moveHelpGenie', {
  undoable: false,
})
