import CommandUniversePage from './CommandUniversePage'

/** Redux-owned page history for the current Command Universe session. */
interface CommandUniverseNavigation {
  entries: { entryId: string; page: CommandUniversePage }[]
  index: number
}

export default CommandUniverseNavigation
