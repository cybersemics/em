import Thunk from '../@types/Thunk'

/** Action-creator for italic. */
const italicActionCreator = (): Thunk => dispatch => dispatch({ type: 'italic' })

export default italicActionCreator
