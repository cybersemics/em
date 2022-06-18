import Thunk from '../@types/Thunk'

/** Action-creator for join. */
const joinActionCreator = (): Thunk => dispatch => dispatch({ type: 'join' })

export default joinActionCreator
