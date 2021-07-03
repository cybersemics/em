import { Shortcut } from '../types'
import { State } from '../util/initialState'

/**
 * Add latest gesture to show on the screen.
 */
const addLatestShortcuts = (state: State, shortcut: Shortcut): State => ({
  ...state,
  latestShortcuts: [...state.latestShortcuts, shortcut],
})

export default addLatestShortcuts
