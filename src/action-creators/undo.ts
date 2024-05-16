import Thunk from '../@types/Thunk'

/** Action-creator for undo. */
export const undoActionCreator = (): Thunk => dispatch => dispatch({ type: 'undo' })
