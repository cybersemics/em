// selectors
import {
  getThoughtsRanked,
  meta,
} from '../selectors'

// utils
import {
  isFunction,
  pathToContext,
} from '../util'

// reducers
import setCursor from './setCursor'

/** Moves the cursor forward in the cursorHistory. */
export default state => {

  // pop from cursor history
  if (state.cursorHistory.length > 0) {
    const cursorNew = state.cursorHistory[state.cursorHistory.length - 1]
    return setCursor(state, { thoughtsRanked: cursorNew, cursorHistoryPop: true })
  }
  // otherwise move cursor to first child
  else {
    const cursorOld = state.cursor
    const firstSubthought = cursorOld && getThoughtsRanked(state, cursorOld).find(child => state.showHiddenThoughts || (!isFunction(child.value) && !meta(state, [...pathToContext(cursorOld), child.value]).hidden))
    if (firstSubthought) {
      const cursorNew = cursorOld.concat(firstSubthought)
      return setCursor(state, { thoughtsRanked: cursorNew })
    }
    else {
      return state
    }
  }
}
