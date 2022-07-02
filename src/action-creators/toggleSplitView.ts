import Thunk from '../@types/Thunk'
import toggleSplitView from '../reducers/toggleSplitView'

/** Action-creator for toggleSplitView. */
const toggleSplitViewActionCreator =
  (payload: Parameters<typeof toggleSplitView>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleSplitView', ...payload })

export default toggleSplitViewActionCreator
