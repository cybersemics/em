import ministore from './ministore'

/** A store that tracks state related to syncing. Updated by yjs/thouguhtspace. */
const syncStatusStore = ministore<{
  isPushing: boolean
  isPulling: boolean
  replicationProgress: number | null
  savingProgress: number
}>({
  // Tracks if the pushQueue is currently pushing to IndexedDB.
  isPushing: false,
  // Tracks if the pullQueue is currently pulling.
  isPulling: false,
  // progress of replicating all thoughts for offline editing (%)
  // null means replication has not started yet
  replicationProgress: null,
  // progress of saving thoughts to IndexedDB
  // mainly needed when deleting or importing a large number of thoughts
  savingProgress: 1,
})

export default syncStatusStore
