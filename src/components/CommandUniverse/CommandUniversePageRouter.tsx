import { ComponentProps, ComponentType, Fragment } from 'react'
import { useSelector } from 'react-redux'
import CommandUniverseCommandPage from './CommandUniverseCommandPage'
import CommandUniversePageTransitions from './CommandUniversePageTransitions'
import commandUniversePages from './commandUniversePages'

/** Resolves registered page ids and forwards their props. Layout and navigation ownership live outside the router. */
const CommandUniversePageRouter = ({ listRef, onBeforeExecute }: Pick<ComponentProps<typeof CommandUniverseCommandPage>, 'listRef' | 'onBeforeExecute'>) => {
  const entries = useSelector(state => state.commandUniverseNavigation.entries)
  return (
    <CommandUniversePageTransitions>
      {entries.map(({ entryId, page }) => {
        // commandUniverseNavigate checks this correlation. TypeScript loses it when indexing a heterogeneous component registry.
        const Page = commandUniversePages[page.pageId] as ComponentType<typeof page.props>
        return (
          <Fragment key={entryId}>
            {page.pageId === 'commands' ? <CommandUniverseCommandPage listRef={listRef} onBeforeExecute={onBeforeExecute} /> : <Page {...page.props} />}
          </Fragment>
        )
      })}
    </CommandUniversePageTransitions>
  )
}

export default CommandUniversePageRouter
