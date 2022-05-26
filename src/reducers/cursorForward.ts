import { HOME_PATH } from '../constants'
import { setCursor } from '../reducers'
import { firstVisibleChild } from '../selectors'
import { head, unroot } from '../util'
import { State } from '../@types'

/** Moves the cursor forward in the cursorHistory. */
const cursorForward = (state: State) => {
  // pop from cursor history
  if (state.cursorHistory.length > 0) {
    const cursorNew = state.cursorHistory[state.cursorHistory.length - 1]
    return setCursor(state, { path: cursorNew, cursorHistoryPop: true })
  }
  // otherwise move cursor to first child
  else {
    const cursor = state.cursor || HOME_PATH

    const firstChild = firstVisibleChild(state, head(cursor))
    if (!firstChild) return state

    const cursorNew = unroot([...cursor, firstChild.id])
    return setCursor(state, { path: cursorNew })
  }
}

export default cursorForward
