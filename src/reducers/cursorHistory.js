// constants
import {
  MAX_CURSOR_HISTORY,
} from '../constants'

export default ({ cursorHistory }, { cursor }) => {
  return {
    cursorHistory: cursorHistory
      // shift first entry if history has exceeded its maximum size
      .slice(cursorHistory.length >= MAX_CURSOR_HISTORY ? 1 : 0)
      .concat([cursor])
  }
}
