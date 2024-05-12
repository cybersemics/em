import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { MAX_CURSOR_HISTORY } from '../constants'

/** Updates the cursor history for navigating forward/backward. */
const cursorHistory = (state: State, { cursor }: { cursor: Path }) => ({
  ...state,
  cursorHistory: state.cursorHistory
    // shift first entry if history has exceeded its maximum size
    .slice(state.cursorHistory.length >= MAX_CURSOR_HISTORY ? 1 : 0)
    .concat([cursor]),
})

/** Action-creator for cursorHistory. */
export const cursorHistoryActionCreator =
  (payload: Parameters<typeof cursorHistory>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'cursorHistory', ...payload })

export default _.curryRight(cursorHistory)
