import { store } from '../store.js'

// util
import { cursorBack } from './cursorBack.js'
import { restoreCursorBeforeSearch } from './restoreCursorBeforeSearch.js'

/** Exits the search or code view, or move the cursor back, whichever is first. */
export const exit = () => {
  const state = store.getState()
  if (state.search != null && !state.cursor) {
    store.dispatch({ type: 'search', value: null })
    restoreCursorBeforeSearch()
  }
  else if (state.codeView) {
    store.dispatch({ type: 'toggleCodeView', value: false })
  }
  else if (state.cursor) {
    cursorBack()
  }
}
