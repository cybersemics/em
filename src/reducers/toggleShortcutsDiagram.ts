import { State } from '../util/initialState'

/**
 * Enable or disable shortcuts diagram.
 */
const toggleShortcutsDiagram = (state: State): State => ({ ...state, enableLatestShorcutsDiagram: !state.enableLatestShorcutsDiagram })

export default toggleShortcutsDiagram
