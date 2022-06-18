import Thunk from '../@types/Thunk'

/** Action-creator for moveThoughtUp. */
const moveThoughtUpActionCreator = (): Thunk => dispatch => dispatch({ type: 'moveThoughtUp' })

export default moveThoughtUpActionCreator
