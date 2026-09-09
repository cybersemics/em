import type CommandDifficulty from './CommandDifficulty'

/** A configured command category, including its stable ID, inferred from the command hierarchy. */
type CommandGroup = CommandDifficulty['groups'][number]

export default CommandGroup
