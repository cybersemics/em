import _ from 'lodash'
import CommandId from '../@types/CommandId'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import storageModel from '../stores/storageModel'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/**
 * Marks a command discovered: the user has met it deliberately, so the Gesture Menu lists it from now on. See
 * LearningState and docs/learning.md.
 */
const discoverCommand = (state: State, { commandId }: { commandId: CommandId }): State =>
  state.learning.discovered.includes(commandId)
    ? state
    : { ...state, learning: { ...state.learning, discovered: [...state.learning.discovered, commandId] } }

/**
 * Dispatches and persists the discovery of a command that is not yet discovered. Dispatches nothing otherwise, so
 * performing a command the user already knows adds no Redux action.
 */
export const discoverCommandActionCreator =
  (payload: Parameters<typeof discoverCommand>[1]): Thunk =>
  (dispatch, getState) => {
    if (getState().learning.discovered.includes(payload.commandId)) return
    dispatch({ type: 'discoverCommand', ...payload })
    storageModel.set('learning', getState().learning)
  }

export default _.curryRight(discoverCommand)

// Discovering a command is not an edit, so it must not participate in undo history.
registerActionMetadata('discoverCommand', {
  undoable: false,
})
