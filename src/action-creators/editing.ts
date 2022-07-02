import Thunk from '../@types/Thunk'
import editing from '../reducers/editing'

/** Action-creator for editing. */
const editingActionCreator =
  (payload: Parameters<typeof editing>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'editing', ...payload })

export default editingActionCreator
