import Thunk from '../@types/Thunk'
import toggleSort from '../reducers/toggleSort'

/** Action-creator for toggleSort. */
const toggleSortActionCreator =
  (payload: Parameters<typeof toggleSort>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleSort', ...payload })

export default toggleSortActionCreator
