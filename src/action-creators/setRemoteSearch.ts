import Thunk from '../@types/Thunk'
import setRemoteSearch from '../reducers/setRemoteSearch'

/** Action-creator for setRemoteSearch. */
const setRemoteSearchActionCreator =
  (payload: Parameters<typeof setRemoteSearch>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setRemoteSearch', ...payload })

export default setRemoteSearchActionCreator
