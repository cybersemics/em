import Thunk from '../@types/Thunk'
import deleteThought from '../reducers/deleteThought'

/** Action-creator for deleteThought. */
const deleteThoughtActionCreator =
  (payload: Parameters<typeof deleteThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'deleteThought', ...payload })

export default deleteThoughtActionCreator
