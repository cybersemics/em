import Thunk from '../@types/Thunk'

/** Action-creator for moveThoughtDown. */
const moveThoughtDownActionCreator = (): Thunk => dispatch => dispatch({ type: 'moveThoughtDown' })

export default moveThoughtDownActionCreator
