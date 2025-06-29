import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import headValue from '../util/headValue'

type NoteFocusType = { value: false; offset?: never } | { value: true; offset: number | null }

/** Sets state.noteFocus to true or false, indicating if the caret is on a note. Sets state.cursorOffset to the end of the thought when disabling note focus so the selection gets placed back correctly on the thought. */
const setNoteFocus = (state: State, { value, offset }: NoteFocusType): State => ({
  ...state,
  // set the cursor offset to the end of the cursor thought
  // we cannot use state.editingValue since it is set to null when the Editable is blurred
  ...(!value && state.cursor ? { cursorOffset: headValue(state, state.cursor)?.length } : null),
  noteFocus: value,
  // clear the offset when the caret leaves a note
  noteOffset: value ? offset : null,
  // always open keyboard when there is note focus
  // it will be set in the Note's onFocus anyway, but set it here so that we are not as dependent on what happens there
  ...(value ? { isKeyboardOpen: true } : null),
})

/** Action-creator for setNoteFocus. */
export const setNoteFocusActionCreator =
  (payload: Parameters<typeof setNoteFocus>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setNoteFocus', ...payload })

export default _.curryRight(setNoteFocus, 2)

// Register this action's metadata
registerActionMetadata('setNoteFocus', {
  undoable: true,
  isNavigation: true,
})
