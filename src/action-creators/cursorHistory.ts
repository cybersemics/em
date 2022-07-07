import Thunk from '../@types/Thunk'
import cursorHistory from '../reducers/cursorHistory'

/** Action-creator for cursorHistory. */
const cursorHistoryActionCreator =
  (payload: Parameters<typeof cursorHistory>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'cursorHistory', ...payload })

export default cursorHistoryActionCreator
