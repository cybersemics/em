import * as commands from '../shortcuts/index'

type CommandSimple = keyof typeof commands
type CommandAlias = `${CommandSimple}Alias`
type CommandId = CommandSimple | CommandAlias

export default CommandId
