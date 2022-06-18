import editing from '../reducers/editing'
import Thunk from '../@types/Thunk'

/** Action-creator for editing. */
const editingActionCreator =
  (payload: Parameters<typeof editing>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'editing', ...payload })

export default editingActionCreator
