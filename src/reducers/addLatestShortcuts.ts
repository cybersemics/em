import Shortcut from '../@types/Shortcut'
import State from '../@types/State'

/**
 * Add latest gesture to show on the screen.
 */
const addLatestShortcuts = (state: State, shortcut: Shortcut): State => ({
  ...state,
  latestShortcuts: [...state.latestShortcuts, shortcut],
})

export default addLatestShortcuts
