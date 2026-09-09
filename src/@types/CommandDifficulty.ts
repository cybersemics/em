import type { COMMAND_DIFFICULTIES } from '../constants'

/** A configured difficulty level, inferred from the single source of truth for the command hierarchy. */
type CommandDifficulty = (typeof COMMAND_DIFFICULTIES)[number]

export default CommandDifficulty
