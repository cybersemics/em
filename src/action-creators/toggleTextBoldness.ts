import Thunk from '../@types/Thunk'

/** Action-creator for toggleTextBoldness. */
const toggleTextBoldnessActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleTextBoldness' })

export default toggleTextBoldnessActionCreator
