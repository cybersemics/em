import CommandId from './CommandId'

/** A category of commands in the static command hierarchy. */
interface CommandGroup {
  /** Stable identity, independent of the display title and containing difficulty. Do not rename when changing either. */
  id:
    | 'creatingThoughts'
    | 'navigation'
    | 'contexts'
    | 'categorizing'
    | 'nudging'
    | 'deleting'
    | 'creatingThoughtsII'
    | 'editHistory'
    | 'notes'
    | 'views'
  title: string
  /** Command IDs in presentation order. */
  commands: CommandId[]
}

export default CommandGroup
