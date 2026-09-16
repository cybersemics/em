import { nanoid } from 'nanoid'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Moves to the next Command Universe history entry when one is available. */
const commandUniverseForward = (state: State, { transitionId = 'forward' }: { transitionId?: string } = {}): State => {
  const { entries, index } = state.commandUniverseNavigation
  if (!state.showMobileCommandUniverse || index === entries.length - 1) return state

  const arrival = entries[index + 1].arrival!
  return {
    ...state,
    commandUniverseNavigation: {
      ...state.commandUniverseNavigation,
      index: index + 1,
      transition: {
        id: transitionId,
        fromEntryId: entries[index].entryId,
        toEntryId: entries[index + 1].entryId,
        ...arrival,
      },
    },
  }
}

/** Dispatches Command Universe forward navigation. */
export const commandUniverseForwardActionCreator = (): Thunk => dispatch => {
  dispatch({ type: 'commandUniverseForward', transitionId: nanoid() })
}

export default commandUniverseForward

registerActionMetadata('commandUniverseForward', {
  undoable: false,
})
