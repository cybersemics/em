import _ from 'lodash'
import CommandId from '../@types/CommandId'
import CommandType from '../@types/CommandType'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import storageModel from '../stores/storageModel'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/**
 * Records a completed command invocation and awards one practice rep when it matches the active pin. Reps keep
 * counting past the target so the widget can react to practice after completion.
 */
const commandSucceeded = (
  state: State,
  { commandId, source, userInitiated }: { commandId: CommandId; source: CommandType; userInitiated: boolean },
): State => {
  const record = state.learning.progress[commandId]
  if (
    !userInitiated ||
    (source !== 'keyboard' && source !== 'gesture') ||
    state.learning.pinnedCommandId !== commandId ||
    !record
  ) {
    return state
  }

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

/** Dispatches a generic command success and persists any learning progress it awards. */
export const commandSucceededActionCreator =
  (payload: Parameters<typeof commandSucceeded>[1]): Thunk =>
  (dispatch, getState) => {
    const learningBefore = getState().learning
    dispatch({ type: 'commandSucceeded', ...payload })
    const learningAfter = getState().learning
    if (learningAfter !== learningBefore) storageModel.set('learning', learningAfter)
  }

export default _.curryRight(commandSucceeded)

registerActionMetadata('commandSucceeded', { undoable: false })
