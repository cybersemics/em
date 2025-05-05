import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Toggles the Command Menu. */
const toggleCommandMenu = (state: State, { value }: { value?: boolean } = {}) => {
  return {
    ...state,
    showCommandMenu: value === undefined ? !state.showCommandMenu : value,
  }
}

/** Action-creator for toggleCommandMenu. */
export const toggleCommandMenuActionCreator =
  (payload: Parameters<typeof toggleCommandMenu>[1] = {}): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleCommandMenu', ...payload })

export default _.curryRight(toggleCommandMenu)

// Register this action's metadata
registerActionMetadata('toggleCommandMenu', {
  undoable: false,
})
