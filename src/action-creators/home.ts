import { restoreCursorBeforeSearch, scrollCursorIntoView } from '../action-creators'
import { clearSelection } from '../util'
import { ActionCreator } from '../types'

/** Navigates home and resets the scroll position. */
const home = (): ActionCreator => (dispatch, getState) => {

  const state = getState()

  if (state.search != null) {
    dispatch({ type: 'search', value: null })
    dispatch(restoreCursorBeforeSearch)
  }
  else {
    dispatch({ type: 'setCursor', path: null, cursorHistoryClear: true })
    clearSelection()
    dispatch(scrollCursorIntoView())
  }
}

export default home
