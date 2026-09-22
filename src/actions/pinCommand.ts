import _ from 'lodash'
import CommandId from '../@types/CommandId'
import { CommandLearningProgress } from '../@types/LearningState'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { LEARNING_TARGET_REPS } from '../constants'
import storageModel from '../stores/storageModel'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/**
 * Pins a command to the persistent corner widget, replacing any previously pinned command and erasing that command's
 * reps. Starts a fresh practice record at the current default target unless this command is already the pinned one,
 * in which case its record is kept. Pinning never executes the command.
 */
const pinCommand = (state: State, { commandId }: { commandId: CommandId }): State => ({
  ...state,
  learning: {
    pinnedCommandId: commandId,
    progress: {
      [commandId]: state.learning.progress[commandId] ?? { reps: 0, targetReps: LEARNING_TARGET_REPS },
    } satisfies Record<string, CommandLearningProgress>,
  },
})

/** Action-creator for pinCommand. */
export const pinCommandActionCreator =
  (payload: Parameters<typeof pinCommand>[1]): Thunk =>
  (dispatch, getState) => {
    dispatch({ type: 'pinCommand', ...payload })
    storageModel.set('learning', getState().learning)
  }

export default _.curryRight(pinCommand)

// Pin selection is not an edit, so it must not participate in undo history.
registerActionMetadata('pinCommand', {
  undoable: false,
})
