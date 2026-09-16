import _ from 'lodash'
import CommandId from '../@types/CommandId'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { LEARNING_TARGET_REPS } from '../constants'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/**
 * Pins a command to the persistent corner widget, replacing any previously pinned command. Initializes a practice
 * record for the command if it has none, capturing the current default target; repinning a command reuses its existing
 * record, so partial and completed progress is retained. Pinning never executes the command.
 */
const pinCommand = (state: State, { commandId }: { commandId: CommandId }): State => ({
  ...state,
  learning: {
    pinnedCommandId: commandId,
    progress: state.learning.progress[commandId]
      ? state.learning.progress
      : { ...state.learning.progress, [commandId]: { reps: 0, targetReps: LEARNING_TARGET_REPS } },
  },
})

/** Action-creator for pinCommand. */
export const pinCommandActionCreator =
  (payload: Parameters<typeof pinCommand>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'pinCommand', ...payload })

export default _.curryRight(pinCommand)

// Pin selection is not an edit, so it must not participate in undo history.
registerActionMetadata('pinCommand', {
  undoable: false,
})
