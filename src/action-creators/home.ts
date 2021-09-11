import { restoreCursorBeforeSearch, search, searchContexts, setCursor } from '../action-creators'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import * as selection from '../device/selection'
import { Thunk } from '../@types'

/** Navigates home and resets the scroll position. */
const home = (): Thunk => (dispatch, getState) => {
  const state = getState()

  if (state.search != null) {
    dispatch(search({ value: null }))
    dispatch(searchContexts({ value: null }))
    dispatch(restoreCursorBeforeSearch)
  } else {
    dispatch(setCursor({ path: null, cursorHistoryClear: true }))
    selection.clear()
    scrollCursorIntoView()
  }
}

export default home
