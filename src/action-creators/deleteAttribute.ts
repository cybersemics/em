import Thunk from '../@types/Thunk'
import deleteAttribute from '../reducers/deleteAttribute'

/** Action-creator for deleteAttribute. */
const deleteAttributeActionCreator =
  (payload: Parameters<typeof deleteAttribute>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'deleteAttribute', ...payload })

export default deleteAttributeActionCreator
