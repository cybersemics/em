import { Thunk } from '../types'

/** An Thunk that dispatches a 'subCategorizeAll` action. */
const subCategorizeAllActionCreator = (): Thunk =>
  dispatch => dispatch({ type: 'subCategorizeAll' })

export default subCategorizeAllActionCreator
