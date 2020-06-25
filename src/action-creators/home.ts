import { clearSelection, restoreCursorBeforeSearch } from '../util'
import { ActionCreator } from '../types'

/** Navigates home and resets the scroll position. */
const home = (): ActionCreator => (dispatch, getState) => {

  const state = getState()

  if (state.search != null) {
    dispatch({ type: 'search', value: null })
    restoreCursorBeforeSearch(state)
  }
  else {
    dispatch({ type: 'setCursor', thoughtsRanked: null, cursorHistoryClear: true })
    window.scrollTo(0, 0)
    clearSelection()
  }
}

export default home
