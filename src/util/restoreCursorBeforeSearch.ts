import { store } from '../store'
import { State } from './initialState'

/** Restores cursor to its position before search. */
export const restoreCursorBeforeSearch = ({ cursorBeforeSearch, editing }: State) => {
  if (cursorBeforeSearch) {
    store.dispatch({ type: 'setCursor', thoughtsRanked: cursorBeforeSearch, editing })
  }
}
