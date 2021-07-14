import _ from 'lodash'
import { Path, State } from '../@types'
import { MAX_CURSOR_HISTORY } from '../constants'

/** Updates the cursor history for navigating forward/backward. */
const cursorHistory = (state: State, { cursor }: { cursor: Path }) => ({
  ...state,
  cursorHistory: state.cursorHistory
    // shift first entry if history has exceeded its maximum size
    .slice(state.cursorHistory.length >= MAX_CURSOR_HISTORY ? 1 : 0)
    .concat([cursor]),
})

export default _.curryRight(cursorHistory)
