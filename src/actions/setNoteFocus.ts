import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import headValue from '../util/headValue'

/** Sets state.noteFocus to true or false, indicating if the caret is on a note. Sets state.cursorOffset to the end of the thought when disabling note focus so the selection gets placed back correctly on the thought. */
const setNoteFocus = (state: State, { value }: { value: boolean }): State => ({
  ...state,
  // set the cursor offset to the end of the cursor thought
  // we cannot use state.editingValue since it is set to null when the Editable is blurred
  ...(!value && state.cursor ? { cursorOffset: headValue(state, state.cursor).length } : null),
  noteFocus: value,
  // always enter edit mode when there is note focus
  // it will be set in the Note's onFocus anyway, but set it here so that we are not as dependent on what happens there
  ...(value ? { editing: true } : null),
})

/** Action-creator for setNoteFocus. */
export const setNoteFocusActionCreator =
  (payload: Parameters<typeof setNoteFocus>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setNoteFocus', ...payload })

export default _.curryRight(setNoteFocus, 2)
