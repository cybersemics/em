import Thunk from '../@types/Thunk'

/** Action-creator for toggleAbsoluteContext. */
const toggleAbsoluteContextActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleAbsoluteContext' })

export default toggleAbsoluteContextActionCreator
