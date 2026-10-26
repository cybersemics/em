import Command from '../@types/Command'
import reactMinistore from './react-ministore'

/** Commands that replace the registered commands wherever the app lists or matches commands, or null for the registered commands. Set only by testHelpers.stubCommands, so that a test can render a fixed command list that does not change whenever a command is added, removed, or renamed. Reset to null between tests. See getGlobalCommands in commands.ts. */
const commandsStore = reactMinistore<{ commands: Command[] | null }>({ commands: null })

export default commandsStore
