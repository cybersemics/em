import { MAX_CURSOR_HISTORY } from '../constants'
import { State } from '../util/initialState'
import { Path } from '../types'

/** Updates the cursor history for navigating forward/backward. */
const cursorHistory = (state: State, { cursor }: { cursor: Path }) => ({
  ...state,
  cursorHistory: state.cursorHistory
    // shift first entry if history has exceeded its maximum size
    .slice(state.cursorHistory.length >= MAX_CURSOR_HISTORY ? 1 : 0)
    .concat([cursor])
})

export default cursorHistory
