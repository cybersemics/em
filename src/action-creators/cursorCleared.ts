import { Thunk } from '../@types'

/** Temporary clear the cursor in response to the clearThought. NOOP if value is no different than current state. See reducers/cursorCleared. */
const cursorCleared =
  ({ value }: { value: boolean }): Thunk =>
  (dispatch, getState) => {
    // Bail if there's no change, otherwise the Editable will get re-rendered by the reducer incrementing editable nonce.
    // This can occur when switching windows which triggers onBlur.
    // See: https://github.com/cybersemics/em/issues/1556
    if (getState().cursorCleared !== value) {
      dispatch({ type: 'cursorCleared', value })
    }
  }

export default cursorCleared
