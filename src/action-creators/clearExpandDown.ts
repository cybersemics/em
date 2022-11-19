import Thunk from '../@types/Thunk'

/** Action-creator for clearExpandDown. */
const clearExpandDownActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearExpandDown' })

export default clearExpandDownActionCreator
