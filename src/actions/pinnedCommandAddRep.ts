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

  return {
    ...state,
    learning: {
      ...state.learning,
      progress: {
        ...state.learning.progress,
        [commandId]: { ...record, reps: record.reps + 1 },
      },
    },
  }
}

/** Dispatches and persists one rep for the pinned command. */
export const pinnedCommandAddRepActionCreator =
  (payload: Parameters<typeof pinnedCommandAddRep>[1]): Thunk =>
  (dispatch, getState) => {
    const learningBefore = getState().learning
    dispatch({ type: 'pinnedCommandAddRep', ...payload })
    const learningAfter = getState().learning
    if (learningAfter !== learningBefore) storageModel.set('learning', learningAfter)
  }

export default _.curryRight(pinnedCommandAddRep)

registerActionMetadata('pinnedCommandAddRep', { undoable: false })
