import { Thunk } from '../@types'
import { setCursor } from '../action-creators'

/** Restores cursor to its position before search. */
const restoreCursorBeforeSearch = (): Thunk => (dispatch, getState) => {
  const { cursorBeforeSearch, editing } = getState()
  if (cursorBeforeSearch) {
    dispatch(setCursor({ path: cursorBeforeSearch, editing }))
  }
}

export default restoreCursorBeforeSearch
