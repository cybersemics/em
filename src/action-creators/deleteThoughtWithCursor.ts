import deleteThoughtWithCursor from '../reducers/deleteThoughtWithCursor'
import Thunk from '../@types/Thunk'

/** Action-creator for deleteThoughtWithCursor. */
const deleteThoughtWithCursorActionCreator =
  (payload: Parameters<typeof deleteThoughtWithCursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'deleteThoughtWithCursor', ...payload })

export default deleteThoughtWithCursorActionCreator
