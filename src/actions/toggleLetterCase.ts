import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Toggles the Letter Case Picker. */
const toggleLetterCase = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showLetterCase: value == null ? !state.showLetterCase : value,
})

/** Action-creator for toggleLetterCase. */
export const toggleLetterCaseActionCreator =
  (payload: Parameters<typeof toggleLetterCase>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleLetterCase', ...payload })

export default _.curryRight(toggleLetterCase)
