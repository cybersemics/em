import Thunk from '../@types/Thunk'
import toolbarLongPress from '../reducers/toolbarLongPress'

/** Action-creator for long pressing a toolbar button in the customize modal. */
const toolbarLongPressActionCreator =
  (payload: Parameters<typeof toolbarLongPress>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toolbarLongPress', ...payload })

export default toolbarLongPressActionCreator
