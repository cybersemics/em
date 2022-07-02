import Thunk from '../@types/Thunk'
import setNoteFocus from '../reducers/setNoteFocus'

/** Action-creator for setNoteFocus. */
const setNoteFocusActionCreator =
  (payload: Parameters<typeof setNoteFocus>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setNoteFocus', ...payload })

export default setNoteFocusActionCreator
