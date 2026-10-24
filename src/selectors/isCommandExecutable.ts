import Command from '../@types/Command'
import State from '../@types/State'

/** Whether a command may run from the Command Universe in the current editor state. */
const isCommandExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showMobileCommandUniverse)

export default isCommandExecutable
