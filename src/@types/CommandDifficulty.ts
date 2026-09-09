import CommandGroup from './CommandGroup'

/** A difficulty level containing ordered command categories. */
interface CommandDifficulty {
  /** Stable identity, independent of the display title and position. Do not rename when changing either. */
  id: 'beginner' | 'intermediate' | 'advanced'
  title: string
  groups: CommandGroup[]
}

export default CommandDifficulty
