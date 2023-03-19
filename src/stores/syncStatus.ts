import ThoughtId from '../@types/ThoughtId'
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

// A Set of thoughts and lexemes being pushed.
const pushing = new Set<string | ThoughtId>()

// track the total number of thoughts being pushed
// resets when pushing is empty
// used to calculate a saving percentage
let total = 0

// extend the ministore with methods for managing isPushing
const syncStatusStoreExtended = {
  ...syncStatusStore,

  /** Adds the thought id or lexeme to the pushing set, sets isPushing: true, and updates savingProgress. */
  pushStart: (key: string | ThoughtId) => {
    pushing.add(key)
    total = Math.max(total, pushing.size)
    syncStatusStore.update({ isPushing: true, savingProgress: (total - pushing.size) / total })
  },

  /** Removes thought id or lexeme key from the pushing, turns off isPushing if empty, and updates savingProgress. */
  pushEnd: (key: string | ThoughtId) => {
    pushing.delete(key)
    if (pushing.size === 0) {
      total = 0
      syncStatusStore.update({ isPushing: false, savingProgress: 1 })
    } else {
      total = Math.max(total, pushing.size)
      syncStatusStore.update({ savingProgress: (total - pushing.size) / total })
    }
  },
}

export default syncStatusStoreExtended
