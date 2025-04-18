import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Toggles the Command Menu. */
const toggleCommandMenu = (state: State, { value }: { value?: boolean } = {}) => {
  // Blur the active element when opening
  if (document && document.activeElement) {
    const activeEl = document.activeElement as HTMLElement
    activeEl?.blur?.()
  }

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
