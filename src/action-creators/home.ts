import restoreCursorBeforeSearch from '../action-creators/restoreCursorBeforeSearch'
import search from '../action-creators/search'
import searchContexts from '../action-creators/searchContexts'
import setCursor from '../action-creators/setCursor'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import * as selection from '../device/selection'
import Thunk from '../@types/Thunk'

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
