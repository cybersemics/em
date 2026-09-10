import { ComponentType } from 'react'
import useCommandUniverseNavigator from '../../hooks/useCommandUniverseNavigator'
import commandUniversePages from './commandUniversePages'

/** Resolves the active page id and forwards its props. Layout and navigation ownership live outside the router. */
const CommandUniversePageRouter = () => {
  const { entries, activeEntryId } = useCommandUniverseNavigator()
  const { page } = entries.find(entry => entry.entryId === activeEntryId)!
  // open() checks this correlation. TypeScript loses it when indexing a heterogeneous component registry.
  const Page = commandUniversePages[page.pageId] as ComponentType<typeof page.props>
  return <Page {...page.props} />
}

export default CommandUniversePageRouter
