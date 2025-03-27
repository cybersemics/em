import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Toggles the Command Menu. */
const toggleCommandMenu = (state: State, { value }: { value?: boolean } = {}) => ({
  ...state,
  commandMenuOpen: value == null ? !state.commandMenuOpen : value,
})

/** Action-creator for toggleCommandMenu. */
export const toggleCommandMenuActionCreator =
  (payload: Parameters<typeof toggleCommandMenu>[1] = {}): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleCommandMenu', ...payload })

export default _.curryRight(toggleCommandMenu)
