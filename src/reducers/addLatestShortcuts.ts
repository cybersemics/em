import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Add latest gesture to show on the screen.
 */
const addLatestShortcuts = (state: State, shortcut: Shortcut): State => ({
  ...state,
  latestShortcuts: [...state.latestShortcuts, shortcut],
})

/** Action-creator for addLatestShortcuts. */
export const addLatestShortcutsActionCreator =
  (payload: Parameters<typeof addLatestShortcuts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'addLatestShortcuts', ...payload })

export default addLatestShortcuts
