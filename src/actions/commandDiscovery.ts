import _ from 'lodash'
import CommandId from '../@types/CommandId'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/**
 * Opens Command Discovery for a command, or closes it with null: the screen that introduces a command the user has
 * just revealed in the Gesture Menu (see CommandDiscovery and docs/learning.md). Marking the command discovered is
 * discoverCommand's job; this only shows the screen.
 */
const commandDiscovery = (state: State, { commandId }: { commandId: CommandId | null }): State => ({
  ...state,
  commandDiscovery: commandId,
})

/** Action-creator for commandDiscovery. */
export const commandDiscoveryActionCreator =
  (payload: Parameters<typeof commandDiscovery>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'commandDiscovery', ...payload })

export default _.curryRight(commandDiscovery)

// Showing a screen is not an edit, so it must not participate in undo history.
registerActionMetadata('commandDiscovery', {
  undoable: false,
})
