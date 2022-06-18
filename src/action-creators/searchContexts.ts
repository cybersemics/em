import searchContexts from '../reducers/searchContexts'
import Thunk from '../@types/Thunk'

/** Action-creator for searchContexts. */
const searchContextsActionCreator =
  (payload: Parameters<typeof searchContexts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'searchContexts', ...payload })

export default searchContextsActionCreator
