import State from '../@types/State'

/**
 * Clear all the latest shortcuts to show on the screen.
 */
const clearLatestShortcuts = (state: State): State => ({ ...state, latestShortcuts: [] })

export default clearLatestShortcuts
