import Command from '../@types/Command'

/** Type predicate for Command. */
function isCommand(value: unknown): value is Command {
  return typeof value === 'object' && value !== null && 'id' in value && 'label' in value && 'exec' in value
}

export default isCommand
