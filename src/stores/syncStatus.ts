import ministore from './ministore'

/** A store that tracks state related to syncing. Updated by yjs/thouguhtspace. */
const syncStatusStore = ministore<{
  isPulling: boolean
  replicationProgress: number | null
  savingProgress: number
  importProgress: number
}>({
  // Tracks if the pullQueue is currently pulling.
  isPulling: false,
  // Progress of replicating all thoughts for offline editing (between 0–1).
  // null means replication has not started yet.
  replicationProgress: null,
  // Progress of saving thoughts to IndexedDB (between 0–1).
  savingProgress: 1,
  // Progress of importing thoughts to IndexedDB (between 0–1).
  // Since files and large pastes are imported incrementally and serially in chunks, we need to maintain the overall import progress separately from savingProgress which constantly gets reset every time a chunk is succesfully imported.
  // This is simpler than trying to delay taskQueue's onEnd
  // Takes precendence over savingProgress.
  importProgress: 1,
})

export default syncStatusStore
