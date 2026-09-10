import CommandUniversePage from './CommandUniversePage'

interface NavigationOptions {
  zoom?: 'in' | 'out'
  /** Source rectangle in viewport coordinates. Omit for a centered transition. */
  origin?: Pick<DOMRectReadOnly, 'x' | 'y' | 'width' | 'height'>
}

type OpenArguments = {
  [Id in CommandUniversePage['pageId']]: [
    pageId: Id,
    props: Extract<CommandUniversePage, { pageId: Id }>['props'],
    options?: NavigationOptions,
  ]
}[CommandUniversePage['pageId']]

/** One Command Universe session. Page identity and props are independent of unique history-entry ids. */
interface CommandUniversePageNavigator {
  entries: readonly { entryId: string; page: CommandUniversePage }[]
  activeEntryId: string
  isOpen: boolean
  transition: {
    id: string
    fromEntryId: string
    toEntryId: string
    zoom: 'in' | 'out'
    origin: NavigationOptions['origin'] | null
  } | null
  canGoBack: boolean
  canGoForward: boolean
  back: () => void
  forward: () => void
  open: (...args: OpenArguments) => void
  /** Late completion from an older animation cannot finish the current transition. */
  finishTransition: (transitionId: string) => void
}

export default CommandUniversePageNavigator
