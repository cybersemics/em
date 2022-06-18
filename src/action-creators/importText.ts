import importText from '../reducers/importText'
import Thunk from '../@types/Thunk'

/** A Thunk that dispatches an 'importText` action. */
const importTextActionCreator =
  (payload: Parameters<typeof importText>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'importText', ...payload })

export default importTextActionCreator
