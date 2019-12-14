import { store } from '../store.js'
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import { restoreSelection } from './restoreSelection.js'

/** Restores cursor to its position before search. */
export const restoreCursorBeforeSearch = () => {
  const cursor = store.getState().cursorBeforeSearch
  if (cursor) {
    store.dispatch({ type: 'setCursor', thoughtsRanked: cursor })
    setTimeout(() => {
      restoreSelection(cursor, { offset: 0 })
    }, RENDER_DELAY)
  }
}
