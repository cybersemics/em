import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Toggles the ColorPicker. */
const toggleLettercase = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showLettercase: value == null ? !state.showLettercase : value,
})

/** Action-creator for toggleColorPicker. */
export const toggleLettercaseActionCreator =
  (payload: Parameters<typeof toggleLettercase>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleLettercase', ...payload })

export default _.curryRight(toggleLettercase)
