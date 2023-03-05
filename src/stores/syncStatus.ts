import ministore from './ministore'

/** A store that tracks state related to syncing. Updated by yjs/thouguhtspace. */
const syncStatusStore = ministore({
  // Tracks if the pushQueue is currently pushing to IndexedDB.
  isPushing: false,
  // progress of replicating all thoughts for offline editing (%)
  replicationProgress: 1,
})

export default syncStatusStore
