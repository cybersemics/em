import { ActionCreator } from '../types'

/** An ActionCreator that dispatches a 'subCategorizeOne` action. */
const subCategorizeOneActionCreator = (): ActionCreator =>
  dispatch => dispatch({ type: 'subCategorizeOne' })

export default subCategorizeOneActionCreator
