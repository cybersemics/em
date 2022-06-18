import Thunk from '../@types/Thunk'

/** Action-creator for toggleNote. */
const toggleNoteActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleNote' })

export default toggleNoteActionCreator
