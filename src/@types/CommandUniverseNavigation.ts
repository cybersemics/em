import CommandUniversePage from './CommandUniversePage'

/** Redux-owned page history for the current Command Universe session. */
interface CommandUniverseNavigation {
  entries: {
    entryId: string
    page: CommandUniversePage
    arrival: {
      zoom: 'in' | 'out'
      /** Source point as fractions of the page width and height. Null uses the page center. */
      origin: { x: number; y: number } | null
    } | null
  }[]
  index: number
  transition: {
    id: string
    fromEntryId: string
    toEntryId: string
    zoom: 'in' | 'out'
    origin: { x: number; y: number } | null
    /** Page transition to play. Omitted means zoom; none settles the destination without animation. */
    type?: 'zoom' | 'none'
  } | null
}

export default CommandUniverseNavigation
