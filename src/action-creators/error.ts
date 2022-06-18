import error from '../reducers/error'
import Thunk from '../@types/Thunk'

/** Action-creator for error. */
const errorActionCreator =
  (payload: Parameters<typeof error>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'error', ...payload })

export default errorActionCreator
