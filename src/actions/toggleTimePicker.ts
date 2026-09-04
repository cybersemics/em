import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import equalPath from '../util/equalPath'
import reducerFlow from '../util/reducerFlow'
import toggleDropdown from './toggleDropdown'

/** Opens the Time bullet popover anchored to the given thought, closing the other dropdowns, or closes it if it is already open on that thought. */
const toggleTimePicker = (state: State, { path }: { path: Path }): State => {
  const isOpenHere = state.showTimePicker && equalPath(state.timePickerPath, path)
  return reducerFlow([
    state => toggleDropdown(state, { dropDownType: 'timePicker', value: !isOpenHere }),
    state => ({ ...state, timePickerPath: isOpenHere ? null : path }),
  ])(state)
}

/** Action-creator for toggleTimePicker. */
export const toggleTimePickerActionCreator =
  (payload: Parameters<typeof toggleTimePicker>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleTimePicker', ...payload })

export default _.curryRight(toggleTimePicker)

registerActionMetadata('toggleTimePicker', {
  undoable: false,
})
