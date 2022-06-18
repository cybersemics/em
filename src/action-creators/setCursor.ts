import setCursor from '../reducers/setCursor'
import Thunk from '../@types/Thunk'

/** Action-creator for setCursor. */
const setCursorActionCreator =
  (payload: Parameters<typeof setCursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setCursor', ...payload })

export default setCursorActionCreator
