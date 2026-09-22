import _ from 'lodash'
import { nanoid } from 'nanoid'
import CommandUniverseNavigation from '../@types/CommandUniverseNavigation'
import CommandUniversePage from '../@types/CommandUniversePage'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

type Arrival = NonNullable<CommandUniverseNavigation['entries'][number]['arrival']>

interface NavigationOptions {
  zoom?: Arrival['zoom']
  /** Source rectangle in viewport coordinates. Omit for a centered transition. */
  origin?: Arrival['origin']
}

type NavigateArguments = {
  [Id in CommandUniversePage['pageId']]: [
    pageId: Id,
    props: Extract<CommandUniversePage, { pageId: Id }>['props'],
    options?: NavigationOptions,
  ]
}[CommandUniversePage['pageId']]

/** Opens a registered Command Universe page and discards any abandoned forward history. */
const commandUniverseNavigate = (
  state: State,
  { entryId, page, arrival }: { entryId: string; page: CommandUniversePage; arrival: Arrival },
): State => {
  if (!state.showMobileCommandUniverse) return state

  const entries = [
    ...state.commandUniverseNavigation.entries.slice(0, state.commandUniverseNavigation.index + 1),
    { entryId, page, arrival },
  ]

  return {
    ...state,
    commandUniverseNavigation: {
      entries,
      index: entries.length - 1,
      transition: {
        id: entryId,
        fromEntryId: state.commandUniverseNavigation.entries[state.commandUniverseNavigation.index].entryId,
        toEntryId: entryId,
        ...arrival,
      },
    },
  }
}

/** Dispatches navigation to a registered Command Universe page. */
export const commandUniverseNavigateActionCreator =
  (...args: NavigateArguments): Thunk =>
  dispatch => {
    const [pageId, props, options = {}] = args
    // The tuple union enforces the page-id/props relationship at this public boundary.
    dispatch({
      type: 'commandUniverseNavigate',
      entryId: nanoid(),
      page: { pageId, props } as CommandUniversePage,
      arrival: { zoom: options.zoom ?? 'in', origin: options.origin ?? null },
    })
  }

export default _.curryRight(commandUniverseNavigate)

registerActionMetadata('commandUniverseNavigate', {
  undoable: false,
})
