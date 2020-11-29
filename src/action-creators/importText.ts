import { importText } from '../reducers'
import { Thunk } from '../types'

/** A Thunk that dispatches an 'importText` action. */
const importTextActionCreator = (payload: Parameters<typeof importText>[1]): Thunk =>
  dispatch => dispatch({ type: 'importText', ...payload })

export default importTextActionCreator
