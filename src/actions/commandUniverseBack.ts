import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Moves to the previous Command Universe history entry when one is available. */
const commandUniverseBack = (state: State): State =>
  !state.showMobileCommandUniverse || state.commandUniverseNavigation.index === 0
    ? state
    : {
        ...state,
        commandUniverseNavigation: {
          ...state.commandUniverseNavigation,
          index: state.commandUniverseNavigation.index - 1,
        },
      }

/** Dispatches Command Universe back navigation. */
export const commandUniverseBackActionCreator = (): Thunk => dispatch => {
  dispatch({ type: 'commandUniverseBack' })
}

export default commandUniverseBack

registerActionMetadata('commandUniverseBack', {
  undoable: false,
})
