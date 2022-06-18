import isPushing from '../reducers/isPushing'
import Thunk from '../@types/Thunk'

/** Action-creator for isPushing. */
const isPushingActionCreator =
  (payload: Parameters<typeof isPushing>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'isPushing', ...payload })

export default isPushingActionCreator
