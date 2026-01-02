import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Clears all multicursors. */
const clearMulticursors = (state: State): State => {
  return {
    ...state,
    ...(state.alert?.alertType === AlertType.ScrollZoneHelp ? { alert: null } : null),
    multicursors: {},
  }
}

/** Action-creator for clearMulticursors. */
export const clearMulticursorsActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearMulticursors' })

export default clearMulticursors

// Register this action's metadata
registerActionMetadata('clearMulticursors', {
  undoable: false,
})
