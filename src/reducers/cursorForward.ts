import { setCursor } from '../reducers'
import { getThoughtsRanked, hasChild } from '../selectors'
import { isFunction, pathToContext } from '../util'
import { State } from '../util/initialState'

/** Moves the cursor forward in the cursorHistory. */
const cursorForward = (state: State) => {

  // pop from cursor history
  if (state.cursorHistory.length > 0) {
    const cursorNew = state.cursorHistory[state.cursorHistory.length - 1]
    return setCursor(state, { thoughtsRanked: cursorNew, cursorHistoryPop: true })
  }
  // otherwise move cursor to first child
  else {
    const cursorOld = state.cursor
    const firstSubthought = cursorOld && getThoughtsRanked(state, cursorOld).find(child => state.showHiddenThoughts || (!isFunction(child.value) && !hasChild(state, [...pathToContext(cursorOld), child.value], '=hidden')))
    if (firstSubthought && cursorOld) {
      const cursorNew = cursorOld.concat(firstSubthought)
      return setCursor(state, { thoughtsRanked: cursorNew })
    }
    else {
      return state
    }
  }
}

export default cursorForward
