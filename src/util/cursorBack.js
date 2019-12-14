import { isMobile } from '../browser.js'
import { store } from '../store.js'

// util
import { contextOf } from './contextOf.js'
import { restoreSelection } from './restoreSelection.js'
import { restoreCursorBeforeSearch } from './restoreCursorBeforeSearch.js'

/** Moves the cursor up one level. */
export const cursorBack = () => {
  const state = store.getState()
  const cursorOld = state.cursor
  if (cursorOld) {
    const cursorNew = contextOf(cursorOld)

    store.dispatch({ type: 'setCursor', itemsRanked: cursorNew.length > 0 ? cursorNew : null })

    // append to cursor history to allow 'forward' gesture
    store.dispatch({ type: 'cursorHistory', cursor: cursorOld })

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
    store.dispatch({ type: 'search', value: null })
    restoreCursorBeforeSearch()
  }
}
