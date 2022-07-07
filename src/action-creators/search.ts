import Thunk from '../@types/Thunk'
import search from '../reducers/search'

/** Action-creator for search. */
const searchActionCreator =
  (payload: Parameters<typeof search>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'search', ...payload })

export default searchActionCreator
