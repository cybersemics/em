import toggleSidebar from '../reducers/toggleSidebar'
import Thunk from '../@types/Thunk'

/** Action-creator for toggleSidebar. */
const toggleSidebarActionCreator =
  (payload: Parameters<typeof toggleSidebar>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleSidebar', ...payload })

export default toggleSidebarActionCreator
