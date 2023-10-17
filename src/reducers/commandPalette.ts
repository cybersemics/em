import _ from 'lodash'
import State from '../@types/State'

/** Toggles the command palette. */
const commandPalette = (state: State) => ({
  ...state,
  // clear the alert when the command palette is opened or closed
  alert: null,
  showCommandPalette: !state.showCommandPalette,
})

export default _.curryRight(commandPalette)
