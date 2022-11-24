import Thunk from '../@types/Thunk'

/** Action-creator for bold. */
const boldActionCreator = (): Thunk => dispatch => dispatch({ type: 'bold' })

export default boldActionCreator
