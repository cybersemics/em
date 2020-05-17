// util
import {
  mergeUpdates,
} from '../util'

// selectors
import {
  expandThoughts,
} from '../selectors'

/**
 * Updates thoughtIndex and contextIndex with any number of thoughts
 * SIDE EFFECT: Sync thoughts here before thoughtIndexUpdates and contextIndexUpdates get merged. By the time there is a new state it is too late, and I want to avoid moving everything into impure action-creators.
 */
export default (state, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, contextChain }) => {

  const thoughtIndex = mergeUpdates(state.thoughtIndex, thoughtIndexUpdates)
  const contextIndex = mergeUpdates(state.contextIndex, contextIndexUpdates)
  const recentlyEditedNew = recentlyEdited || state.recentlyEdited
  const syncQueueOld = state.syncQueue || {}

  // updates are queued, detected by the syncQueue middleware, and sync'd with the local and remote stores
  const syncQueueNew = {
    thoughtIndexUpdates: { ...syncQueueOld.thoughtIndexUpdates, ...thoughtIndexUpdates },
    contextIndexUpdates: { ...syncQueueOld.contextIndexUpdates, ...contextIndexUpdates },
  }

  return {
    contextIndex,
    expanded: expandThoughts(state, state.cursor, contextChain),
    recentlyEdited: recentlyEditedNew,
    syncQueue: syncQueueNew,
    thoughtIndex,
  }
}
