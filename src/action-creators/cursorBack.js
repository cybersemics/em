import { isMobile } from '../browser.js'
import { store } from '../store.js'

// util
import { contextOf } from '../util/contextOf'
import { restoreSelection } from '../util/restoreSelection'
import { restoreCursorBeforeSearch } from '../util/restoreCursorBeforeSearch'

/** Moves the cursor up one level. */
export const cursorBack = () => dispatch => {
  const state = store.getState().present
  const cursorOld = state.cursor
  if (cursorOld) {
    const cursorNew = contextOf(cursorOld)

    dispatch({ type: 'setCursor', thoughtsRanked: cursorNew.length > 0 ? cursorNew : null })

    // append to cursor history to allow 'forward' gesture
    dispatch({ type: 'cursorHistory', cursor: cursorOld })

    if (cursorNew.length > 0) {
      if (!isMobile || state.editing) {
        restoreSelection(cursorNew, { offset: 0 })
      }
    }
    else {
      document.activeElement.blur()
      document.getSelection().removeAllRanges()
    }
  }
  else if (state.search === '') {
    dispatch({ type: 'search', value: null })
    restoreCursorBeforeSearch()
  }
}
