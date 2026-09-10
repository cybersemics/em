import CommandUniversePage from './CommandUniversePage'

type OpenArguments = {
  [Id in CommandUniversePage['pageId']]: [pageId: Id, props: Extract<CommandUniversePage, { pageId: Id }>['props']]
}[CommandUniversePage['pageId']]

/** One Command Universe session. Page identity and props are independent of unique history-entry ids. */
interface CommandUniversePageNavigator {
  entries: readonly { entryId: string; page: CommandUniversePage }[]
  activeEntryId: string
  isOpen: boolean
  canGoBack: boolean
  canGoForward: boolean
  back: () => void
  forward: () => void
  open: (...args: OpenArguments) => void
}

export default CommandUniversePageNavigator
