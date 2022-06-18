import archiveThought from '../reducers/archiveThought'
import Thunk from '../@types/Thunk'

/** Action-creator for archiveThought. */
const archiveThoughtActionCreator =
  (payload: Parameters<typeof archiveThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'archiveThought', ...payload })

export default archiveThoughtActionCreator
