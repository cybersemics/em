import Thunk from '../@types/Thunk'

/** Action-creator for indent. */
const indentActionCreator = (): Thunk => dispatch => dispatch({ type: 'indent' })

export default indentActionCreator
