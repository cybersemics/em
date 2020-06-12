/** Clears the sync queue. This should only be done after the queued updates are persisted. See redux-middleware/syncQueue. */
export default state => ({
  ...state,
  syncQueue: [],
})
