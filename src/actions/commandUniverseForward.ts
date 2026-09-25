import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Moves to the next Command Universe history entry when one is available. */
const commandUniverseForward = (state: State): State =>
  !state.showMobileCommandUniverse ||
  state.commandUniverseNavigation.index === state.commandUniverseNavigation.entries.length - 1
    ? state
    : {
        ...state,
        commandUniverseNavigation: {
          ...state.commandUniverseNavigation,
          index: state.commandUniverseNavigation.index + 1,
        },
      }

/** Dispatches Command Universe forward navigation. */
export const commandUniverseForwardActionCreator = (): Thunk => dispatch => {
  dispatch({ type: 'commandUniverseForward' })
}

export default commandUniverseForward

registerActionMetadata('commandUniverseForward', {
  undoable: false,
})
