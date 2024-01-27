import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Toggles the command palette. */
const commandPalette = (state: State) => ({
  ...state,
  showCommandPalette: !state.showCommandPalette,
})

/** Action-creator for commandPalette. */
export const commandPaletteActionCreator = (): Thunk => dispatch => dispatch({ type: 'commandPalette' })

export default _.curryRight(commandPalette)
