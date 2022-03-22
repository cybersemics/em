import { Thunk } from '../@types'

/** Sets boolean value for native caret selection. */
export const setNativeCaretSelection =
  (value: boolean): Thunk =>
  (dispatch, getState) => {
    dispatch({ type: 'setNativeCaretSelection', value })
  }
