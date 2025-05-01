import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Set availability of remote search. */
const setRemoteSearch = (state: State, { value }: { value: boolean }): State => ({ ...state, remoteSearch: value })

/** Action-creator for setRemoteSearch. */
export const setRemoteSearchActionCreator =
  (payload: Parameters<typeof setRemoteSearch>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setRemoteSearch', ...payload })

export default setRemoteSearch

// Register this action's metadata
registerActionMetadata('setRemoteSearch', {
  undoable: false,
})
