import { store } from '../store'
import { InitialStateInterface } from './initialState'

/** Restores cursor to its position before search. */
export const restoreCursorBeforeSearch = ({ cursorBeforeSearch, editing }: InitialStateInterface) => {
  if (cursorBeforeSearch) {
    store.dispatch({ type: 'setCursor', thoughtsRanked: cursorBeforeSearch, editing })
  }
}
