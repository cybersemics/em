import deleteThought from '../reducers/deleteThought'
import Thunk from '../@types/Thunk'

/** Action-creator for deleteThought. */
const deleteThoughtActionCreator =
  (payload: Parameters<typeof deleteThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'deleteThought', ...payload })

export default deleteThoughtActionCreator
