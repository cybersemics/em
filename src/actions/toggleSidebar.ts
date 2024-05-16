import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Toggles the sidebar. */
const toggleSidebar = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showSidebar: value == null ? !state.showSidebar : value,
})

/** Action-creator for toggleSidebar. */
export const toggleSidebarActionCreator =
  (payload: Parameters<typeof toggleSidebar>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleSidebar', ...payload })

export default _.curryRight(toggleSidebar)
