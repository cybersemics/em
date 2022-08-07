import Thunk from '../@types/Thunk'
import toggleColorPicker from '../reducers/toggleColorPicker'

/** Action-creator for toggleColorPicker. */
const toggleColorPickerActionCreator =
  (payload: Parameters<typeof toggleColorPicker>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleColorPicker', ...payload })

export default toggleColorPickerActionCreator
