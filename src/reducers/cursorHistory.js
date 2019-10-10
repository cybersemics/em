import { MAX_CURSOR_HISTORY } from '../constants'

export const cursorHistory = (state) => ({ cursor }) => {
  return {
    cursorHistory: state.cursorHistory
      // shift first entry if history has exceeded its maximum size
      .slice(state.cursorHistory.length >= MAX_CURSOR_HISTORY ? 1 : 0)
      .concat([cursor])
  }
}