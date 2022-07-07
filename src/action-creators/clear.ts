import Thunk from '../@types/Thunk'
import clear from '../reducers/clear'

/** Action-creator for clear. */
const clearActionCreator =
  (payload?: Parameters<typeof clear>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'clear', ...payload })

export default clearActionCreator
