import authenticate from '../reducers/authenticate'
import Thunk from '../@types/Thunk'

/** Action-creator for authenticate. */
const authenticateActionCreator =
  (payload: Parameters<typeof authenticate>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'authenticate', ...payload })

export default authenticateActionCreator
