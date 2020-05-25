/** Clears the sync queue. This should only be done after the queued updates are persisted (See redux-middleware/syncQueue and action-creators/flushQueue) */
export default state => ({
  syncQueue: {
    thoughtIndexUpdates: {},
    contextIndexUpdates: {},
    recentlyEdited: null
  }
})
