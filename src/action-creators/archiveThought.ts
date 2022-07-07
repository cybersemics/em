import Thunk from '../@types/Thunk'
import archiveThought from '../reducers/archiveThought'

/** Action-creator for archiveThought. */
const archiveThoughtActionCreator =
  (payload: Parameters<typeof archiveThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'archiveThought', ...payload })

export default archiveThoughtActionCreator
