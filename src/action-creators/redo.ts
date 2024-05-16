import Thunk from '../@types/Thunk'

/** Action-creator for redo. */
export const redoActionCreator = (): Thunk => dispatch => dispatch({ type: 'redo' })
