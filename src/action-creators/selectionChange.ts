import Thunk from '../@types/Thunk'
import selectionChange from '../reducers/selectionChange'

/** Action-creator for selectionChange. */
const selectionChangeActionCreator =
  (payload: Parameters<typeof selectionChange>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'selectionChange', ...payload })

export default selectionChangeActionCreator
