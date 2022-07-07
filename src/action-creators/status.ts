import Thunk from '../@types/Thunk'
import status from '../reducers/status'

/** Action-creator for status. */
const statusActionCreator =
  (payload: Parameters<typeof status>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'status', ...payload })

export default statusActionCreator
