import Thunk from '../@types/Thunk'

/** A Thunk that dispatches a 'subCategorizeAll` action. */
const subCategorizeAllActionCreator = (): Thunk => dispatch => dispatch({ type: 'subCategorizeAll' })

export default subCategorizeAllActionCreator
