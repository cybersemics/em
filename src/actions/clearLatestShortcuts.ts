import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Clear all the latest shortcuts to show on the screen.
 */
const clearLatestShortcuts = (state: State): State => ({ ...state, latestShortcuts: [] })

/** Action-creator for clearLatestShortcuts. */
export const clearLatestShortcutsActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearLatestShortcuts' })

export default clearLatestShortcuts
