import _ from 'lodash'
import CommandId from '../@types/CommandId'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import storageModel from '../stores/storageModel'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Awards one rep to the pinned command after a qualifying invocation succeeds. */
const awardPracticeRep = (state: State, { commandId }: { commandId: CommandId }): State => {
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

/** Dispatches and persists an earned practice rep. */
export const awardPracticeRepActionCreator =
  (payload: Parameters<typeof awardPracticeRep>[1]): Thunk =>
  (dispatch, getState) => {
    const learningBefore = getState().learning
    dispatch({ type: 'awardPracticeRep', ...payload })
    const learningAfter = getState().learning
    if (learningAfter !== learningBefore) storageModel.set('learning', learningAfter)
  }

export default _.curryRight(awardPracticeRep)

registerActionMetadata('awardPracticeRep', { undoable: false })
