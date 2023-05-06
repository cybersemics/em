import Thunk from '../@types/Thunk'

/** Action-creator for freeThoughts. */
const freeThoughtsActionCreator = (): Thunk => dispatch => dispatch({ type: 'freeThoughts' })

export default freeThoughtsActionCreator
