import Thunk from '../@types/Thunk'

/** Action-creator for clearLatestShortcuts. */
const clearLatestShortcutsActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearLatestShortcuts' })

export default clearLatestShortcutsActionCreator
