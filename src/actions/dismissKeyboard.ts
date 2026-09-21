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
  // Edit mode may already have ended by the time the platform reports the keyboard hiding — a tap outside the thought
  // blurs the editable first, and a long press that selects a word ends it via onFocus — but the browser keeps a
  // native touch selection alive through both, leaving the selection handles and the text context menu on screen after
  // the keyboard is gone (#4833). The keyboard hiding is the authoritative signal that the user is done editing, so
  // take the selection with it no matter what state edit mode is in.
  else if (!selection.isCollapsed()) {
    selection.clear()
  }
}
