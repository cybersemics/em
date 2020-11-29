import { Thunk } from '../types'

/** A Thunk that dispatches a 'subCategorizeOne` action. */
const subCategorizeOneActionCreator = (): Thunk =>
  dispatch => dispatch({ type: 'subCategorizeOne' })

export default subCategorizeOneActionCreator
