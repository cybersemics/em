import _ from 'lodash'
import CommandId from '../@types/CommandId'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import storageModel from '../stores/storageModel'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Adds one rep to the pinned command after a qualifying invocation succeeds. */
const pinnedCommandAddRep = (state: State, { commandId }: { commandId: CommandId }): State => {
  const record = state.learning.progress[commandId]
  if (state.learning.pinnedCommandId !== commandId || !record) return state

  const reps = record.reps + 1
  return {
    ...state,
    learning: {
      ...state.learning,
      progress: {
        ...state.learning.progress,
        [commandId]: { ...record, reps },
      },
      // Filling the ring is what learns a command. It stays learned after it is unpinned and its reps are erased.
      learned:
        reps >= record.targetReps && !state.learning.learned.includes(commandId)
          ? [...state.learning.learned, commandId]
          : state.learning.learned,
    },
  }
}

/** Dispatches and persists one rep when the command is the current pin with a progress record. Dispatches nothing otherwise, so other commands add no Redux action. */
export const pinnedCommandAddRepActionCreator =
  (payload: Parameters<typeof pinnedCommandAddRep>[1]): Thunk =>
  (dispatch, getState) => {
    const learningBefore = getState().learning
    if (learningBefore.pinnedCommandId !== payload.commandId || !learningBefore.progress[payload.commandId]) return
    dispatch({ type: 'pinnedCommandAddRep', ...payload })
    const learningAfter = getState().learning
    if (learningAfter !== learningBefore) storageModel.set('learning', learningAfter)
  }

export default _.curryRight(pinnedCommandAddRep)

registerActionMetadata('pinnedCommandAddRep', { undoable: false })
