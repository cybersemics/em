import Thunk from '../@types/Thunk'

/** Action-creator for deleteEmptyThought. */
const deleteEmptyThoughtActionCreator = (): Thunk => dispatch => dispatch({ type: 'deleteEmptyThought' })

export default deleteEmptyThoughtActionCreator
