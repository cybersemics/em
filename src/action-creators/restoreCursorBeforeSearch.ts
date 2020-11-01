import { ActionCreator } from '../types'

/** Restores cursor to its position before search. */
const restoreCursorBeforeSearch = (): ActionCreator => (dispatch, getState) => {
  const { cursorBeforeSearch, editing } = getState()
  if (cursorBeforeSearch) {
    dispatch({ type: 'setCursor', path: cursorBeforeSearch, editing })
  }
}

export default restoreCursorBeforeSearch
