import { store } from '../store'

// util
import {
  contextOf,
  restoreCursorBeforeSearch,
} from '../util'

/** Moves the cursor up one level. */
export const cursorBack = () => dispatch => {
  const { cursor: cursorOld, editing, search } = store.getState()
  if (cursorOld) {
    const cursorNew = contextOf(cursorOld)

    dispatch({ type: 'setCursor', thoughtsRanked: cursorNew.length > 0 ? cursorNew : null, editing })

    // append to cursor history to allow 'forward' gesture
    dispatch({ type: 'cursorHistory', cursor: cursorOld })

    if (cursorNew.length === 0) {
      document.activeElement.blur()
      document.getSelection().removeAllRanges()
    }
  }
  else if (search === '') {
    dispatch({ type: 'search', value: null })
    restoreCursorBeforeSearch()
  }
}
