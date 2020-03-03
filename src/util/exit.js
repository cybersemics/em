import { store } from '../store.js'
import { error } from '../action-creators/error.js'

// action-creators
import { cursorBack } from '../action-creators/cursorBack'

// util
import { restoreCursorBeforeSearch } from './restoreCursorBeforeSearch.js'

/** Exits the search or code view, or move the cursor back, whichever is first. */
export const exit = () => {
  const state = store.getState().present
  if (state.error) {
    error(null)
  }
  else if (state.search != null && !state.cursor) {
    store.dispatch({ type: 'search', value: null })
    restoreCursorBeforeSearch()
  }
  else if (state.codeView) {
    store.dispatch({ type: 'toggleCodeView', value: false })
  }
  else if (state.cursor) {
    store.dispatch(cursorBack())
  }
}
