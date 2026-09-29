import type { COMMAND_DIFFICULTIES } from '../constants'

/** Contains groups of commands, organized by their "difficulty" level in the learning tree. */
type CommandDifficulty = (typeof COMMAND_DIFFICULTIES)[number]

export default CommandDifficulty
