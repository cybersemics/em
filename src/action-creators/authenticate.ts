import Thunk from '../@types/Thunk'
import authenticate from '../reducers/authenticate'

/** Action-creator for authenticate. */
const authenticateActionCreator =
  (payload: Parameters<typeof authenticate>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'authenticate', ...payload })

export default authenticateActionCreator
