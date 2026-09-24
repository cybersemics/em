import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Finishes the current Command Universe transition when its id still matches. */
const commandUniverseFinishTransition = (state: State, { transitionId }: { transitionId: string }): State =>
  state.commandUniverseNavigation.transition?.id !== transitionId
    ? state
    : {
        ...state,
        commandUniverseNavigation: {
          ...state.commandUniverseNavigation,
          transition: null,
        },
      }

/** Dispatches completion for a specific Command Universe transition. */
export const commandUniverseFinishTransitionActionCreator =
  (transitionId: string): Thunk =>
  dispatch => {
    dispatch({ type: 'commandUniverseFinishTransition', transitionId })
  }

export default commandUniverseFinishTransition

registerActionMetadata('commandUniverseFinishTransition', {
  undoable: false,
})
