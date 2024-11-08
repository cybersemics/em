import State from '../@types/State'
import Thunk from '../@types/Thunk'
import asyncFocus from '../device/asyncFocus'

/**
 * Sets state.cursorCleared which controls a special state in which the cursor is rendered as an empty string. In this state the thought can be deleted or edited, but if the user navigates away the thought is restored to its previous value.
 */
const cursorCleared = (state: State, { value }: { value: boolean }): State => ({
  ...state,
  // set cursor offset to 0, otherwise useEditMode will fail to set the selection when cursorCleared is activated
  cursorOffset: 0,
  cursorCleared: value,
  // ContentEditable does not re-render while editing
  // Use editableNonce to force re-render
  // otherwise clearThought will not work after editing a thought
  editableNonce: state.editableNonce + 1,
  // manually set edit mode to true since the cursor is not changing and normally setCursor handles this
  editing: value,
})

/** Temporary clear the cursor in response to the clearThought. NOOP if value is no different than current state. See actions/cursorCleared. */
export const cursorClearedActionCreator =
  ({ value }: { value: boolean }): Thunk =>
  (dispatch, getState) => {
    // Bail if there's no change, otherwise the Editable will get re-rendered by the reducer incrementing editable nonce.
    // This can occur when switching windows which triggers onBlur.
    // See: https://github.com/cybersemics/em/issues/1556
    if (getState().cursorCleared !== value) {
      asyncFocus()
      dispatch({ type: 'cursorCleared', value })
    }
  }

export default cursorCleared
