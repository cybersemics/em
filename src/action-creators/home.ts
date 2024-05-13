import Thunk from '../@types/Thunk'
import restoreCursorBeforeSearch from '../action-creators/restoreCursorBeforeSearch'
import scrollTo from '../device/scrollTo'
import * as selection from '../device/selection'
import { searchActionCreator as search } from '../reducers/search'
import { searchContextsActionCreator as searchContexts } from '../reducers/searchContexts'
import { setCursorActionCreator as setCursor } from '../reducers/setCursor'

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
  }

  scrollTo('top')
}

export default home
