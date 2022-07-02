import Thunk from '../@types/Thunk'
import dragHold from '../reducers/dragHold'

/** Action-creator for dragHold. */
const dragHoldActionCreator =
  (payload: Parameters<typeof dragHold>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'dragHold', ...payload })

export default dragHoldActionCreator
