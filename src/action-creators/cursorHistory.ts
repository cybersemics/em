import cursorHistory from '../reducers/cursorHistory'
import Thunk from '../@types/Thunk'

/** Action-creator for cursorHistory. */
const cursorHistoryActionCreator =
  (payload: Parameters<typeof cursorHistory>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'cursorHistory', ...payload })

export default cursorHistoryActionCreator
