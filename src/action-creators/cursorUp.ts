import Thunk from '../@types/Thunk'

/** Action-creator for cursorUp. */
const cursorUpActionCreator = (): Thunk => dispatch => dispatch({ type: 'cursorUp' })

export default cursorUpActionCreator
