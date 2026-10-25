import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Updates the session's search. */
const commandUniverseSearch = (state: State, { value }: { value: string }): State => ({
  ...state,
  commandUniverseBrowsing: { ...state.commandUniverseBrowsing, search: value },
})

/** Updates the Command Universe browsing controls. */
export const commandUniverseSearchActionCreator =
  (value: string): Thunk =>
  dispatch => {
    dispatch({ type: 'commandUniverseSearch', value })
  }

export default _.curryRight(commandUniverseSearch)

registerActionMetadata('commandUniverseSearch', { undoable: false })
