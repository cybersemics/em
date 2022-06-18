import cursorBeforeSearch from '../reducers/cursorBeforeSearch'
import Thunk from '../@types/Thunk'

/** Action-creator for cursorBeforeSearch. */
const cursorBeforeSearchActionCreator =
  (payload: Parameters<typeof cursorBeforeSearch>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'cursorBeforeSearch', ...payload })

export default cursorBeforeSearchActionCreator
