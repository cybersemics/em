import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Closes the Command Menu.
 */
const closeCommandMenu = (state: State) => {
  return {
    ...state,
    commandMenuOpen: false,
  }
}

/** Action-creator for closeCommandMenu. */
export const closeCommandMenuActionCreator = (): Thunk => dispatch => {
  dispatch({ type: 'closeCommandMenu' })
}

export default _.curryRight(closeCommandMenu)
