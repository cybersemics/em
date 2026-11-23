import CommandId from '../@types/CommandId'
import State from '../@types/State'
import testFlags from '../e2e/testFlags'

/**
 * Whether the user has discovered a command, so the Gesture Menu lists it (see LearningState). Cancel and Command
 * Universe are always listed. So is every command while a test has stubbed the command list, since a stub is not a
 * command anyone could discover.
 */
const isCommandDiscovered = (state: State, commandId: CommandId) =>
  commandId === 'cancel' ||
  commandId === 'openMobileCommandUniverse' ||
  !!testFlags.stubCommands ||
  state.learning.discovered.includes(commandId)

export default isCommandDiscovered
