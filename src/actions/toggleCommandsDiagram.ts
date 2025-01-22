import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Enable or disable latest commands diagram for webcasts.
 */
const toggleCommandsDiagram = (state: State): State => ({
  ...state,
  enableLatestCommandsDiagram: !state.enableLatestCommandsDiagram,
})

/** Action-creator for toggleCommandsDiagram. */
export const toggleCommandsDiagramActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleCommandsDiagram' })

export default toggleCommandsDiagram
