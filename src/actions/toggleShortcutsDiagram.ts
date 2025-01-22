import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Enable or disable latest commands diagram for webcasts.
 */
const toggleShortcutsDiagram = (state: State): State => ({
  ...state,
  enableLatestCommandsDiagram: !state.enableLatestCommandsDiagram,
})

/** Action-creator for toggleShortcutsDiagram. */
export const toggleShortcutsDiagramActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleShortcutsDiagram' })

export default toggleShortcutsDiagram
