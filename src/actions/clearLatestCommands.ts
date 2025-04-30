import { registerActionMetadata } from '../@types/ActionMetadata'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Clear all the latest commands to show on the screen.
 */
const clearLatestCommands = (state: State): State => ({ ...state, latestCommands: [] })

/** Action-creator for clearLatestCommands. */
export const clearLatestCommandsActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearLatestCommands' })

export default clearLatestCommands

// Register this action's metadata
registerActionMetadata('clearLatestCommands', {
  undoable: false,
})
