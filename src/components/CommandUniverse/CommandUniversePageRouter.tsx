import { ComponentType, Fragment } from 'react'
import useCommandUniverseNavigator from '../../hooks/useCommandUniverseNavigator'
import CommandUniversePageTransitions from './CommandUniversePageTransitions'
import commandUniversePages from './commandUniversePages'

/** Resolves registered page ids and forwards their props. Layout and navigation ownership live outside the router. */
const CommandUniversePageRouter = () => {
  const navigator = useCommandUniverseNavigator()
  return (
    <CommandUniversePageTransitions>
      {navigator.entries.map(({ entryId, page }) => {
        // open() checks this correlation. TypeScript loses it when indexing a heterogeneous component registry.
        const Page = commandUniversePages[page.pageId] as ComponentType<typeof page.props>
        return (
          <Fragment key={entryId}>
            <Page {...page.props} />
          </Fragment>
        )
      })}
    </CommandUniversePageTransitions>
  )
}

export default CommandUniversePageRouter
