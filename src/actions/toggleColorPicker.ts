import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Toggles the ColorPicker. */
const toggleColorPicker = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showColorPicker: value == null ? !state.showColorPicker : value,
})

/** Action-creator for toggleColorPicker. */
export const toggleColorPickerActionCreator =
  (payload: Parameters<typeof toggleColorPicker>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleColorPicker', ...payload })

export default _.curryRight(toggleColorPicker)
