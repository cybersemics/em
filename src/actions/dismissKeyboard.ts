/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { keyboardOpenActionCreator as keyboardOpen } from '../actions/keyboardOpen'
import * as selection from '../device/selection'

/**
 * Clears the browser selection and exits edit mode (sets isKeyboardOpen: false).
 *
 * Used when the virtual keyboard is dismissed without a preceding blur event. On Android the keyboard can
 * be hidden (e.g. via the Down Arrow virtual button or the native Capacitor keyboardDidHide event) without
 * blurring the editable, so no blur event fires to clear the caret. Clearing the browser selection blurs
 * the active editable and removes the caret.
 *
 * See: https://github.com/cybersemics/em/issues/3958.
 */
export const dismissKeyboardActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  if (state.isKeyboardOpen && state.cursor) {
    selection.clear()
    dispatch(keyboardOpen({ value: false }))
  }
}
