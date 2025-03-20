import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Sets the active radio button.
 */
const setActiveRadioButton = (state: State, action: { value: string }) => {
  return {
    ...state,
    activeRadioButton: action.value,
  }
}

/** Action-creator for setActiveRadioButton. */
export const setActiveRadioButtonActionCreator = (value: string): Thunk => dispatch => {
  dispatch({ type: 'setActiveRadioButton', value })
}

export default _.curryRight(setActiveRadioButton)