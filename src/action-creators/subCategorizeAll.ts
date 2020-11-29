import { Thunk } from '../types'

/** A Thunk that dispatches a 'subCategorizeAll` action. */
const subCategorizeAllActionCreator = (): Thunk =>
  dispatch => dispatch({ type: 'subCategorizeAll' })

export default subCategorizeAllActionCreator
