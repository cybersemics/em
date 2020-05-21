// util
import {
  restoreCursorBeforeSearch,
} from '../util'

/** Navigates home and resets the scroll position. */
export default () => (dispatch, getState) => {

  const { search } = getState()

  if (search != null) {
    dispatch({ type: 'search', value: null })
    restoreCursorBeforeSearch()
  }
  else {
    dispatch({ type: 'setCursor', thoughtsRanked: null, cursorHistoryClear: true })
    window.scrollTo(0, 0)
    document.getSelection().removeAllRanges()
  }
}
