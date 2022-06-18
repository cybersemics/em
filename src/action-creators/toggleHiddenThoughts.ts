import Thunk from '../@types/Thunk'

/** Action-creator for toggleHiddenThoughts. */
const toggleHiddenThoughtsActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleHiddenThoughts' })

export default toggleHiddenThoughtsActionCreator
