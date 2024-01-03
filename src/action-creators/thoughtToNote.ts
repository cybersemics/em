import Thunk from '../@types/Thunk'

/** Action-creator for thoughtToNote. */
const thoughtToNoteActionCreator = (): Thunk => dispatch => dispatch({ type: 'thoughtToNote' })

export default thoughtToNoteActionCreator
