import Thunk from '../@types/Thunk'
import cursorBeforeSearch from '../reducers/cursorBeforeSearch'

/** Action-creator for cursorBeforeSearch. */
const cursorBeforeSearchActionCreator =
  (payload: Parameters<typeof cursorBeforeSearch>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'cursorBeforeSearch', ...payload })

export default cursorBeforeSearchActionCreator
