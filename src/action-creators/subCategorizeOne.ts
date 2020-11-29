import { Thunk } from '../types'

/** An Thunk that dispatches a 'subCategorizeOne` action. */
const subCategorizeOneActionCreator = (): Thunk =>
  dispatch => dispatch({ type: 'subCategorizeOne' })

export default subCategorizeOneActionCreator
