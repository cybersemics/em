import _ from 'lodash'
import CommandSortType from '../@types/CommandSortType'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Sets the sort order the user chose. It is kept across opens of the Command Universe until the app reloads. */
const commandUniverseSort = (state: State, { value }: { value: CommandSortType }): State => ({
  ...state,
  commandUniverseNavigation: { ...state.commandUniverseNavigation, sortOrder: value },
})

/** Updates the Command Universe browsing controls. */
export const commandUniverseSortActionCreator =
  (value: CommandSortType): Thunk =>
  dispatch => {
    dispatch({ type: 'commandUniverseSort', value })
  }

export default _.curryRight(commandUniverseSort)

registerActionMetadata('commandUniverseSort', { undoable: false })
