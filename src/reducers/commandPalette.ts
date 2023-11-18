import _ from 'lodash'
import State from '../@types/State'

/** Toggles the command palette. */
const commandPalette = (state: State) => ({
  ...state,
  showCommandPalette: !state.showCommandPalette,
})

export default _.curryRight(commandPalette)
