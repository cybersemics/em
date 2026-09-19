import CommandUniversePage from './CommandUniversePage'

/** Redux-owned page history for the current Command Universe session. */
interface CommandUniverseNavigation {
  entries: {
    entryId: string
    page: CommandUniversePage
    arrival: {
      zoom: 'in' | 'out'
      /** Source rectangle in viewport coordinates. Null uses the page center. */
      origin: Pick<DOMRectReadOnly, 'x' | 'y' | 'width' | 'height'> | null
    } | null
  }[]
  index: number
  transition: {
    id: string
    fromEntryId: string
    toEntryId: string
    zoom: 'in' | 'out'
    origin: Pick<DOMRectReadOnly, 'x' | 'y' | 'width' | 'height'> | null
  } | null
}

export default CommandUniverseNavigation
