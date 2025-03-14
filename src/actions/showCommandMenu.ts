import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Opens the Command Menu.
 */
const showCommandMenu = (state: State) => {
  return {
    ...state,
    commandMenuOpen: true,
  }
}

/** Display the Command Menu. */
export const showCommandMenuActionCreator = (): Thunk => (dispatch, getState) => {
  dispatch({ type: 'showCommandMenu' })
}

export default _.curryRight(showCommandMenu)
