import Thunk from '../@types/Thunk'

/** Action-creator for outdent. */
const outdentActionCreator = (): Thunk => dispatch => dispatch({ type: 'outdent' })

export default outdentActionCreator
