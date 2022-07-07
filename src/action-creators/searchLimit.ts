import Thunk from '../@types/Thunk'
import searchLimit from '../reducers/searchLimit'

/** Action-creator for searchLimit. */
const searchLimitActionCreator =
  (payload: Parameters<typeof searchLimit>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'searchLimit', ...payload })

export default searchLimitActionCreator
