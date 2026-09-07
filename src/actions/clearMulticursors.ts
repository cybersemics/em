import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import expandThoughts from '../selectors/expandThoughts'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Clears all multicursors. */
const clearMulticursors = (state: State): State => {
  const stateNew = {
    ...state,
    ...(state.alert?.alertType === AlertType.ScrollZoneHelp ? { alert: null } : null),
    multicursorAnchor: null,
    multicursorRange: {},
    multicursors: {},
  }

  return {
    ...stateNew,
    // Selected thoughts are kept collapsed by expandThoughts, so expansion must be recalculated when the
    // selection is cleared, otherwise a deselected cursor stays collapsed.
    // https://github.com/cybersemics/em/issues/4738
    expanded: expandThoughts(stateNew, stateNew.cursor),
  }
}

/** Action-creator for clearMulticursors. */
export const clearMulticursorsActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearMulticursors' })

export default clearMulticursors

// Register this action's metadata
registerActionMetadata('clearMulticursors', {
  undoable: false,
})
