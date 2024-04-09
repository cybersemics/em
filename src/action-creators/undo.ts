import Thunk from '../@types/Thunk'

/** Action-creator for undo. */
const undo = (): Thunk => dispatch => dispatch({ type: 'undo' })

export default undo
