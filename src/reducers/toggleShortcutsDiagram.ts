import State from '../@types/State'

/**
 * Enable or disable shortcuts diagram.
 */
const toggleShortcutsDiagram = (state: State): State => ({
  ...state,
  enableLatestShorcutsDiagram: !state.enableLatestShorcutsDiagram,
})

export default toggleShortcutsDiagram
