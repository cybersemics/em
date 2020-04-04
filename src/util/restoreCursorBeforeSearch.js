import { store } from '../store.js'

/** Restores cursor to its position before search. */
export const restoreCursorBeforeSearch = () => {
  const { cursorBeforeSearch, editing } = store.getState()
  if (cursorBeforeSearch) {
    store.dispatch({ type: 'setCursor', thoughtsRanked: cursorBeforeSearch, editing })
  }
}
