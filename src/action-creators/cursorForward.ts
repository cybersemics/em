import Thunk from '../@types/Thunk'

/** Action-creator for cursorForward. */
const cursorForwardActionCreator = (): Thunk => dispatch => dispatch({ type: 'cursorForward' })

export default cursorForwardActionCreator
