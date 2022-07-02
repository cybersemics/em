import Thunk from '../@types/Thunk'
import editingValue from '../reducers/editingValue'

/** Action-creator for editingValue. */
const editingValueActionCreator =
  (payload: Parameters<typeof editingValue>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'editingValue', ...payload })

export default editingValueActionCreator
