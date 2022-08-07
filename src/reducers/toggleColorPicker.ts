import _ from 'lodash'
import State from '../@types/State'

/** Toggles the ColorPicker. */
const toggleColorPicker = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showColorPicker: value == null ? !state.showColorPicker : value,
})

export default _.curryRight(toggleColorPicker)
