import Thunk from '../@types/Thunk'
import undoArchive from '../reducers/undoArchive'

/** Action-creator for undoArchive. */
const undoArchiveActionCreator =
  (payload: Parameters<typeof undoArchive>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'undoArchive', ...payload })

export default undoArchiveActionCreator
