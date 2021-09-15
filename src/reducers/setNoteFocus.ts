import _ from 'lodash'
import { State } from '../@types'

/** Sets state.noteFocus to true or false, indicating if the caret is on a note. Sets state.cursorOffset to the end of the thought when disabling note focus so the selection gets placed back correctly on the thought. */
const setNoteFocus = (state: State, { value }: { value: boolean }): State => ({
  ...state,
  // set the cursor offset to the end of the thought
  cursorOffset: !value && state.editingValue != null ? state.editingValue.length : state.cursorOffset,
  noteFocus: value,
})

export default _.curryRight(setNoteFocus, 2)
