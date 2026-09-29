import _ from 'lodash'
import { nanoid } from 'nanoid'
import CommandUniversePage from '../@types/CommandUniversePage'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

type NavigateArguments = {
  [Id in CommandUniversePage['pageId']]: [pageId: Id, props: Extract<CommandUniversePage, { pageId: Id }>['props']]
}[CommandUniversePage['pageId']]

/** Opens a registered Command Universe page and discards any abandoned forward history. */
const commandUniverseNavigate = (
  state: State,
  { entryId, page }: { entryId: string; page: CommandUniversePage },
): State => {
  if (!state.showMobileCommandUniverse) return state

  const entries = [
    ...state.commandUniverseNavigation.entries.slice(0, state.commandUniverseNavigation.index + 1),
    { entryId, page },
  ]

  return {
    ...state,
    commandUniverseNavigation: {
      entries,
      index: entries.length - 1,
    },
  }
}

/** Dispatches navigation to a registered Command Universe page. */
export const commandUniverseNavigateActionCreator =
  (...args: NavigateArguments): Thunk =>
  dispatch => {
    const [pageId, props] = args
    // The tuple union enforces the page-id/props relationship at this public boundary.
    dispatch({
      type: 'commandUniverseNavigate',
      entryId: nanoid(),
      page: { pageId, props } as CommandUniversePage,
    })
  }

export default _.curryRight(commandUniverseNavigate)

registerActionMetadata('commandUniverseNavigate', {
  undoable: false,
})
