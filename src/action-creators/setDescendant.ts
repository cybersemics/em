import Thunk from '../@types/Thunk'
import setDescendant from '../reducers/setDescendant'

/** Action-creator for setDescendant. */
const setDescendantActionCreator =
  (payload: Parameters<typeof setDescendant>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setDescendant', ...payload })

export default setDescendantActionCreator
