import setCursor from '../action-creators/setCursor'
import Thunk from '../@types/Thunk'

/** Restores cursor to its position before search. */
const restoreCursorBeforeSearch = (): Thunk => (dispatch, getState) => {
  const { cursorBeforeSearch, editing } = getState()
  if (cursorBeforeSearch) {
    dispatch(setCursor({ path: cursorBeforeSearch, editing }))
  }
}

export default restoreCursorBeforeSearch
