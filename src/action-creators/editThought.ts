import editThought from '../reducers/editThought'
import Thunk from '../@types/Thunk'

/** Action-creator for editThought. */
const editThoughtActionCreator =
  (payload: Parameters<typeof editThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'editThought', ...payload })

export default editThoughtActionCreator
