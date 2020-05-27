// constants
import {
  MAX_CURSOR_HISTORY,
} from '../constants'

/** Updates the cursor history for navigating forward/backward. */
export default (state, { cursor }) => ({
  ...state,
  cursorHistory: state.cursorHistory
    // shift first entry if history has exceeded its maximum size
    .slice(state.cursorHistory.length >= MAX_CURSOR_HISTORY ? 1 : 0)
    .concat([cursor])
})
