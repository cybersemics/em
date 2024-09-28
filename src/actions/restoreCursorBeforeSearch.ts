import Thunk from '../@types/Thunk'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'

/** Restores cursor to its position before search. */
const restoreCursorBeforeSearch = (): Thunk => (dispatch, getState) => {
  const { cursorBeforeSearch, editing } = getState()
  if (cursorBeforeSearch) {
    dispatch(setCursor({ path: cursorBeforeSearch, editing }))
  }
}

export default restoreCursorBeforeSearch
