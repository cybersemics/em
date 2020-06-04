// util
import {
  restoreCursorBeforeSearch,
} from '../util'

/** Navigates home and resets the scroll position. */
export default () => (dispatch, getState) => {

  const state = getState()

  if (state.search != null) {
    dispatch({ type: 'search', value: null })
    restoreCursorBeforeSearch(state)
  }
  else {
    dispatch({ type: 'setCursor', thoughtsRanked: null, cursorHistoryClear: true })
    window.scrollTo(0, 0)
    document.getSelection().removeAllRanges()
  }
}
