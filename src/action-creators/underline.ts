import Thunk from '../@types/Thunk'

/** Action-creator for underline. */
const underlineActionCreator = (): Thunk => dispatch => dispatch({ type: 'underline' })

export default underlineActionCreator
