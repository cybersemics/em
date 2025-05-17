import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Toggles (hide/show) the gesture cheatsheet. */
const toggleGestureCheatsheet = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showGestureCheatsheet: value == null ? !state.showGestureCheatsheet : value,
})

/** Action-creator for toggleGestureCheatsheet. */
export const toggleGestureCheatsheetActionCreator =
  ({ value }: Parameters<typeof toggleGestureCheatsheet>[1]): Thunk =>
  dispatch => {
    if (value) {
      selection.clear()
    }
    dispatch({ type: 'toggleGestureCheatsheet', value })
  }

export default _.curryRight(toggleGestureCheatsheet)

registerActionMetadata('toggleGestureCheatsheet', {
  undoable: false,
})
