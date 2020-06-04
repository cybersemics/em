// util
import {
  logWithTime,
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
export default (state, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, contextChain, updates }) => {

  const thoughtIndex = mergeUpdates(state.thoughts.thoughtIndex, thoughtIndexUpdates)
  logWithTime('updateThoughts: merge thoughtIndexUpdates')

  const contextIndex = mergeUpdates(state.thoughts.contextIndex, contextIndexUpdates)
  logWithTime('updateThoughts: merge contextIndexUpdates')

  const recentlyEditedNew = recentlyEdited || state.recentlyEdited
  const syncQueue = state.syncQueue || clearQueue(state).syncQueue

  // updates are queued, detected by the syncQueue middleware, and sync'd with the local and remote stores
  const syncQueueNew = {
    thoughtIndexUpdates: { ...syncQueue.thoughtIndexUpdates, ...thoughtIndexUpdates },
    contextIndexUpdates: { ...syncQueue.contextIndexUpdates, ...contextIndexUpdates },
    recentlyEdited, // only sync recentlyEdited if modified
    updates,
  }

  logWithTime('updateThoughts: merge syncQueue')

  const expanded = expandThoughts(state, state.cursor, contextChain)

  logWithTime('updateThoughts: expanded')

  return {
    ...state,
    expanded,
    recentlyEdited: recentlyEditedNew,
    syncQueue: syncQueueNew,
    thoughts: {
      contextIndex,
      thoughtIndex,
    },
  }
}
