import Thunk from '../@types/Thunk'
import searchContexts from '../reducers/searchContexts'

/** Action-creator for searchContexts. */
const searchContextsActionCreator =
  (payload: Parameters<typeof searchContexts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'searchContexts', ...payload })

export default searchContextsActionCreator
