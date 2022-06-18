import search from '../reducers/search'
import Thunk from '../@types/Thunk'

/** Action-creator for search. */
const searchActionCreator =
  (payload: Parameters<typeof search>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'search', ...payload })

export default searchActionCreator
