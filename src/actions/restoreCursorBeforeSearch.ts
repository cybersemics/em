/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'

/** Restores cursor to its position before search. */
export const restoreCursorBeforeSearch = (): Thunk => (dispatch, getState) => {
  const { cursorBeforeSearch, isKeyboardOpen } = getState()
  if (cursorBeforeSearch) {
    dispatch(setCursor({ path: cursorBeforeSearch, isKeyboardOpen }))
  }
}
