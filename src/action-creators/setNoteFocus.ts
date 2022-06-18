import setNoteFocus from '../reducers/setNoteFocus'
import Thunk from '../@types/Thunk'

/** Action-creator for setNoteFocus. */
const setNoteFocusActionCreator =
  (payload: Parameters<typeof setNoteFocus>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setNoteFocus', ...payload })

export default setNoteFocusActionCreator
