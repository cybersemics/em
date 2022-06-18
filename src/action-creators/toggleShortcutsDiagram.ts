import Thunk from '../@types/Thunk'

/** Action-creator for toggleShortcutsDiagram. */
const toggleShortcutsDiagramActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleShortcutsDiagram' })

export default toggleShortcutsDiagramActionCreator
