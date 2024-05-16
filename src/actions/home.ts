import Thunk from '../@types/Thunk'
import { restoreCursorBeforeSearch } from '../actions/restoreCursorBeforeSearch'
import { searchActionCreator as search } from '../actions/search'
import { searchContextsActionCreator as searchContexts } from '../actions/searchContexts'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import scrollTo from '../device/scrollTo'
import * as selection from '../device/selection'

/** Navigates home and resets the scroll position. */
export const homeActionCreator = (): Thunk => (dispatch, getState) => {
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
