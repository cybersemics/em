import CommandUniversePage from './CommandUniversePage'

/** Redux-owned page history for the current Command Universe session. */
interface CommandUniverseNavigation {
  entries: {
    entryId: string
    page: CommandUniversePage
    arrival: {
      /** Page transition to play. Omitted means zoom; none settles without animation. */
      type?: 'zoom' | 'none'
      zoom: 'in' | 'out'
      /** Source point as fractions of the page width and height. Null uses the page center. */
      origin: { x: number; y: number } | null
    } | null
  }[]
  index: number
}

export default CommandUniverseNavigation
