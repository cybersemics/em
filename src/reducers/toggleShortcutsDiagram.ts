import State from '../@types/State'

/**
 * Enable or disable latest shortcuts diagram for webcasts.
 */
const toggleShortcutsDiagram = (state: State): State => ({
  ...state,
  enableLatestShortcutsDiagram: !state.enableLatestShortcutsDiagram,
})

export default toggleShortcutsDiagram
