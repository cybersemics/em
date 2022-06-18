import Thunk from '../@types/Thunk'

/** Action-creator for extractThought. */
const extractThoughtActionCreator = (): Thunk => dispatch => dispatch({ type: 'extractThought' })

export default extractThoughtActionCreator
