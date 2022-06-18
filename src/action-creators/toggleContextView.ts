import Thunk from '../@types/Thunk'

/** Action-creator for toggleContextView. */
const toggleContextViewActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleContextView' })

export default toggleContextViewActionCreator
