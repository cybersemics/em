//@ts-nocheck

import { store } from '../store'

/** Restores cursor to its position before search. */
export const restoreCursorBeforeSearch = () => {
  const { cursorBeforeSearch, editing } = store.getState()
  if (cursorBeforeSearch) {
    store.dispatch({ type: 'setCursor', thoughtsRanked: cursorBeforeSearch, editing })
  }
}
