import { State } from '../util/initialState'

/** Clears the sync queue. This should only be done after the queued updates are persisted (See redux-middleware/syncQueue and action-creators/flushQueue). */
const clearQueue = (state: State) => ({
  ...state,
  syncQueue: {
    thoughtIndexUpdates: {},
    contextIndexUpdates: {},
    recentlyEdited: null,
    updates: null,
  }
})

export default clearQueue
