import Thunk from '../@types/Thunk'

/** Action-creator for clearExpandBottom. */
const clearExpandBottomActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearExpandBottom' })

export default clearExpandBottomActionCreator
