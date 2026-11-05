import CommandId from './CommandId'
import CommandType from './CommandType'

/** The completed invocation, including internal calls that have no user input source. */
type CommandSuccess = { commandId: CommandId; source: CommandType | 'internal' }

export default CommandSuccess
