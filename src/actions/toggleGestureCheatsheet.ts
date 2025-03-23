import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Toggles (hide/show) the gesture cheatsheet. */
const toggleGestureCheatsheet = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showGestureCheatsheet: value == null ? !state.showGestureCheatsheet : value,
})

/** Action-creator for toggleGestureCheatsheet. */
export const toggleGestureCheatsheetActionCreator =
  (payload: Parameters<typeof toggleGestureCheatsheet>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleGestureCheatsheet', ...payload })

export default _.curryRight(toggleGestureCheatsheet)