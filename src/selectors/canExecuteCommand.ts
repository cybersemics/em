import Command from '../@types/Command'
import State from '../@types/State'
import isAttributeSelected from './isAttributeSelected'

/** Returns true if the command can be executed in the given state. A command is not executable while any selected thought is inside a metaprogramming attribute, unless it opts in with `allowOnAttribute`, since attributes are read-only. Otherwise it defers to the command's own `canExecute`. Every entry point that executes a command or renders it as enabled checks this rather than `canExecute` directly. */
const canExecuteCommand = (state: State, command: Command): boolean =>
  (!!command.allowOnAttribute ||
    !isAttributeSelected(state, typeof command.multicursor === 'object' ? command.multicursor.filter : undefined)) &&
  (!command.canExecute || command.canExecute(state))

export default canExecuteCommand
