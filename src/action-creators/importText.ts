import { importText } from '../reducers'
import { ActionCreator } from '../types'

/** An ActionCreator that dispatches an 'importText` action. */
const importTextActionCreator = (payload: Parameters<typeof importText>[1]): ActionCreator =>
  dispatch => dispatch({ type: 'importText', ...payload })

export default importTextActionCreator
