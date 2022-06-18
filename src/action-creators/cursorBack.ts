import Thunk from '../@types/Thunk'

/** Action-creator for cursorBack. */
const cursorBackActionCreator = (): Thunk => dispatch => dispatch({ type: 'cursorBack' })

export default cursorBackActionCreator
