// selectors
import {
  getThoughtsRanked,
} from '../selectors'

// utils
import {
  isFunction,
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
    const firstSubthought = cursorOld && getThoughtsRanked(state, cursorOld).find(children => state.showHiddenThoughts || !isFunction(children.value))
    if (firstSubthought) {
      const cursorNew = cursorOld.concat(firstSubthought)
      return setCursor(state, { thoughtsRanked: cursorNew })
    }
    else {
      return state
    }
  }
}
