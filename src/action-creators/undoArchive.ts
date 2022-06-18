import undoArchive from '../reducers/undoArchive'
import Thunk from '../@types/Thunk'

/** Action-creator for undoArchive. */
const undoArchiveActionCreator =
  (payload: Parameters<typeof undoArchive>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'undoArchive', ...payload })

export default undoArchiveActionCreator
