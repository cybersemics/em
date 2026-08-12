import Command from '../@types/Command'
import ministore from './ministore'

/** A store that tracks the last command that was executed so that it can be executed again by the repeat command. The command is stored here rather than in commands.ts so that it can be read without importing the command index.
 *
 * The command is wrapped in an object because ministore merges partial updates into object state, which would merge the properties of the old and new commands rather than replacing one with the other.
 */
const lastCommandStore = ministore<{ command: Command | null }>({ command: null })

export default lastCommandStore
