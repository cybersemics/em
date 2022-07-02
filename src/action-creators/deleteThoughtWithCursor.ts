import Thunk from '../@types/Thunk'
import deleteThoughtWithCursor from '../reducers/deleteThoughtWithCursor'

/** Action-creator for deleteThoughtWithCursor. */
const deleteThoughtWithCursorActionCreator =
  (payload: Parameters<typeof deleteThoughtWithCursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'deleteThoughtWithCursor', ...payload })

export default deleteThoughtWithCursorActionCreator
