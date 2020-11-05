import { clearSelection, restoreCursorBeforeSearch, scrollCursorIntoView } from '../util'
import { ActionCreator } from '../types'

/** Navigates home and resets the scroll position. */
const home = (): ActionCreator => (dispatch, getState) => {

  const state = getState()

  if (state.search != null) {
    dispatch({ type: 'search', value: null })
    restoreCursorBeforeSearch(state)
  }
  else {
    dispatch({ type: 'setCursor', path: null, cursorHistoryClear: true })
    clearSelection()
    setTimeout(scrollCursorIntoView)
  }
}

export default home
