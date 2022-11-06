import Thunk from '../@types/Thunk'

/** Action-creator for toggleTextItalicStyle. */
const toggleTextItalicStyleActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleTextItalicStyle' })

export default toggleTextItalicStyleActionCreator
