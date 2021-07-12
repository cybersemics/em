import { Shortcut, State } from '../@types'

/**
 * Add latest gesture to show on the screen.
 */
const addLatestShortcuts = (state: State, shortcut: Shortcut): State => ({
  ...state,
  latestShortcuts: [...state.latestShortcuts, shortcut],
})

export default addLatestShortcuts
