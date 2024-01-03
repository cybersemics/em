import Thunk from '../@types/Thunk'

/** Action-creator for swapNote. */
const swapNoteActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapNote' })

export default swapNoteActionCreator
