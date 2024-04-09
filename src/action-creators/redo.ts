import Thunk from '../@types/Thunk'

/** Action-creator for redo. */
const redo = (): Thunk => dispatch => dispatch({ type: 'redo' })

export default redo
