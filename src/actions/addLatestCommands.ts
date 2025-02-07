import Command from '../@types/Command'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/**
 * Add latest gesture to show on the screen.
 */
const addLatestCommands = (state: State, command: Command): State => ({
  ...state,
  latestCommands: [...state.latestCommands, command],
})

/** Action-creator for addLatestCommands. */
export const addLatestCommandsActionCreator =
  (payload: Parameters<typeof addLatestCommands>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'addLatestCommands', ...payload })

export default addLatestCommands
