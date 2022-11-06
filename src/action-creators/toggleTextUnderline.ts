import Thunk from '../@types/Thunk'

/** Action-creator for toggleTextUnderline. */
const toggleTextUnderlineActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleTextUnderline' })

export default toggleTextUnderlineActionCreator
