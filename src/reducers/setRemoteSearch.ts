import { State } from '../util/initialState'

/** Set availability of remote search. */
const setRemoteSearch = (state: State, { value }: {value: boolean}): State => ({ ...state, remoteSearch: value })

export default setRemoteSearch
