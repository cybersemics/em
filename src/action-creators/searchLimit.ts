import searchLimit from '../reducers/searchLimit'
import Thunk from '../@types/Thunk'

/** Action-creator for searchLimit. */
const searchLimitActionCreator =
  (payload: Parameters<typeof searchLimit>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'searchLimit', ...payload })

export default searchLimitActionCreator
