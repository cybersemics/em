import Thunk from '../@types/Thunk'

/** Action-creator for cursorDown. */
const cursorDownActionCreator = (): Thunk => dispatch => dispatch({ type: 'cursorDown' })

export default cursorDownActionCreator
