import { ActionCreator } from '../types'

/** An ActionCreator that dispatches a 'subCategorizeAll` action. */
const subCategorizeAllActionCreator = (): ActionCreator =>
  dispatch => dispatch({ type: 'subCategorizeAll' })

export default subCategorizeAllActionCreator
