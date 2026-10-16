import { nanoid } from 'nanoid'
import CommandSortType from '../@types/CommandSortType'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Resets Command Universe navigation to the registered grid root. */
const commandUniverseReset = (
  state: State,
  { entryId = 'root', sortOrder = 'type' }: { entryId?: string; sortOrder?: CommandSortType } = {},
): State => ({
  ...state,
  commandUniverseBrowsing: { search: '', sortOrder },
  commandUniverseNavigation: {
    entries: [{ entryId, page: { pageId: 'commands', props: {} }, arrival: null }],
    index: 0,
  },
})

/** Dispatches a Command Universe navigation reset. */
export const commandUniverseResetActionCreator = (): Thunk => dispatch => {
  dispatch({ type: 'commandUniverseReset', entryId: nanoid() })
}

export default commandUniverseReset

registerActionMetadata('commandUniverseReset', {
  undoable: false,
})
