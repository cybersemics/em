// util
import {
  mergeUpdates,
} from '../util'

// selectors
import {
  expandThoughts,
} from '../selectors'

import clearQueue from './clearQueue'

/**
 * Updates thoughtIndex and contextIndex with any number of thoughts.
 */
export default (state, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, contextChain }) => {

  const thoughtIndex = mergeUpdates(state.thoughts.thoughtIndex, thoughtIndexUpdates)
  const contextIndex = mergeUpdates(state.thoughts.contextIndex, contextIndexUpdates)
  const recentlyEditedNew = recentlyEdited || state.recentlyEdited
  const syncQueue = state.syncQueue || clearQueue(state).syncQueue

  // updates are queued, detected by the syncQueue middleware, and sync'd with the local and remote stores
  const syncQueueNew = {
    thoughtIndexUpdates: { ...syncQueue.thoughtIndexUpdates, ...thoughtIndexUpdates },
    contextIndexUpdates: { ...syncQueue.contextIndexUpdates, ...contextIndexUpdates },
    recentlyEdited, // only sync recentlyEdited if modified
  }

  return {
    ...state,
    expanded: expandThoughts(state, state.cursor, contextChain),
    recentlyEdited: recentlyEditedNew,
    syncQueue: syncQueueNew,
    thoughts: {
      contextIndex,
      thoughtIndex,
    },
  }
}
