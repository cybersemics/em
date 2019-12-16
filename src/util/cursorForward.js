import { isMobile } from '../browser.js'
import { store } from '../store.js'

// util
import { getThoughts } from './getThoughts.js'
import { restoreSelection } from './restoreSelection.js'

export const cursorForward = () => {
  const state = store.getState()

  // pop from cursor history
  if (state.cursorHistory.length > 0) {
    const cursorNew = state.cursorHistory[state.cursorHistory.length - 1]
    store.dispatch({ type: 'setCursor', thoughtsRanked: cursorNew, cursorHistoryPop: true })

    if (state.cursor && (!isMobile || state.editing)) {
      restoreSelection(cursorNew, { offset: 0 })
    }
  }
  // otherwise move cursor to first child
  else {
    const cursorOld = state.cursor
    const firstChild = cursorOld && getThoughts(cursorOld)[0]
    if (firstChild) {
      const cursorNew = cursorOld.concat(firstChild)
      store.dispatch({ type: 'setCursor', thoughtsRanked: cursorNew })
      if (!isMobile || state.editing) {
        restoreSelection(cursorNew, { offset: 0 })
      }
    }
  }
}
