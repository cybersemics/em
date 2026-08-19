/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { restoreCursorBeforeSearch } from '../actions/restoreCursorBeforeSearch'
import { searchActionCreator as search } from '../actions/search'
import { searchContextsActionCreator as searchContexts } from '../actions/searchContexts'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { toggleEmContextActionCreator as toggleEmContext } from '../actions/toggleEmContext'
import scrollTo from '../device/scrollTo'
import * as selection from '../device/selection'
import isEM from '../util/isEM'

/** Navigates home and resets the scroll position. */
export const homeActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()

  if (state.search != null) {
    dispatch(search({ value: null }))
    dispatch(searchContexts({ value: null }))
    dispatch(restoreCursorBeforeSearch)
  } else {
    // exit the EM context back to the home thoughtspace
    if (isEM(state.rootContext)) {
      dispatch(toggleEmContext())
    }
    dispatch(setCursor({ path: null, cursorHistoryClear: true }))
    selection.clear()
  }

  scrollTo('top', 'smooth')
}
