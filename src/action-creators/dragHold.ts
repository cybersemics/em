import dragHold from '../reducers/dragHold'
import Thunk from '../@types/Thunk'

/** Action-creator for dragHold. */
const dragHoldActionCreator =
  (payload: Parameters<typeof dragHold>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'dragHold', ...payload })

export default dragHoldActionCreator
