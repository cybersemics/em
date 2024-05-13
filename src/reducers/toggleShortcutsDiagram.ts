import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Enable or disable latest shortcuts diagram for webcasts.
 */
const toggleShortcutsDiagram = (state: State): State => ({
  ...state,
  enableLatestShortcutsDiagram: !state.enableLatestShortcutsDiagram,
})

/** Action-creator for toggleShortcutsDiagram. */
export const toggleShortcutsDiagramActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleShortcutsDiagram' })

export default toggleShortcutsDiagram
