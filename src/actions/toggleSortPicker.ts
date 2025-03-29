import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Toggles the Sort Picker. */
const toggleSortPicker = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showSortPicker: value == null ? !state.showSortPicker : value,
})

/** Action-creator for toggleSortPicker. */
export const toggleSortPickerActionCreator =
  (payload: Parameters<typeof toggleSortPicker>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleSortPicker', ...payload })

export default _.curryRight(toggleSortPicker)
