import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

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
