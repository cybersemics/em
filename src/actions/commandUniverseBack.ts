import { nanoid } from 'nanoid'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Moves to the previous Command Universe history entry when one is available. */
const commandUniverseBack = (state: State, { transitionId = 'back' }: { transitionId?: string } = {}): State => {
  const { entries, index } = state.commandUniverseNavigation
  if (!state.showMobileCommandUniverse || index === 0) return state

  const arrival = entries[index].arrival!
  return {
    ...state,
    commandUniverseNavigation: {
      ...state.commandUniverseNavigation,
      index: index - 1,
      transition: {
        id: transitionId,
        fromEntryId: entries[index].entryId,
        toEntryId: entries[index - 1].entryId,
        origin: arrival.origin,
        zoom: arrival.zoom === 'in' ? 'out' : 'in',
      },
    },
  }
}

/** Dispatches Command Universe back navigation. */
export const commandUniverseBackActionCreator = (): Thunk => dispatch => {
  dispatch({ type: 'commandUniverseBack', transitionId: nanoid() })
}

export default commandUniverseBack

registerActionMetadata('commandUniverseBack', {
  undoable: false,
})
