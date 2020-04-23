import { store } from '../store'

// util
import { getThoughtsRanked } from '../util/getThoughtsRanked'

export const cursorForward = () => dispatch => {
  const state = store.getState()

  // pop from cursor history
  if (state.cursorHistory.length > 0) {
    const cursorNew = state.cursorHistory[state.cursorHistory.length - 1]
    dispatch({ type: 'setCursor', thoughtsRanked: cursorNew, cursorHistoryPop: true })
  }
  // otherwise move cursor to first child
  else {
    const cursorOld = state.cursor
    const firstSubthought = cursorOld && getThoughtsRanked(cursorOld)[0]
    if (firstSubthought) {
      const cursorNew = cursorOld.concat(firstSubthought)
      dispatch({ type: 'setCursor', thoughtsRanked: cursorNew })
    }
  }
}
