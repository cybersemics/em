import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { LEARNING_STARTER_COMMANDS } from '../constants'
import storageModel from '../stores/storageModel'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/**
 * Forgets every command the user has discovered, so the Gesture Menu lists only the starter commands again and the
 * rest can be discovered afresh through Command Discovery. The pinned command stays discovered, since pinning a command
 * discovers it. Practice progress is kept. See LearningState and docs/learning.md.
 */
const resetDiscoveredCommands = (state: State): State => ({
  ...state,
  learning: {
    ...state.learning,
    discovered: _.uniq([
      ...LEARNING_STARTER_COMMANDS,
      ...(state.learning.pinnedCommandId ? [state.learning.pinnedCommandId] : []),
    ]),
  },
})

/** Action-creator for resetDiscoveredCommands. Persists the reset learning state. */
export const resetDiscoveredCommandsActionCreator = (): Thunk => (dispatch, getState) => {
  dispatch({ type: 'resetDiscoveredCommands' })
  storageModel.set('learning', getState().learning)
}

export default resetDiscoveredCommands

// Forgetting discovered commands is a setting, not an edit, so it must not participate in undo history.
registerActionMetadata('resetDiscoveredCommands', {
  undoable: false,
})
