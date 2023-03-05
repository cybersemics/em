import ThoughtId from '../@types/ThoughtId'
import ministore from './ministore'

/** A store that tracks state related to syncing. Updated by yjs/thouguhtspace. */
const syncStatusStore = ministore({
  // Tracks if the pushQueue is currently pushing to IndexedDB.
  isPushing: false,
  // progress of replicating all thoughts for offline editing (%)
  replicationProgress: 1,
})

// A Set of thoughts and lexemes being pushed.
const pushing = new Set<string | ThoughtId>()

// extend the ministore with methods for managing isPushing
const syncStatusStoreExtended = {
  ...syncStatusStore,

  /** Adds the thought id or lexeme to the pushing and sets isPushing. */
  pushStart: (key: string | ThoughtId) => {
    pushing.add(key)
    syncStatusStore.update({ isPushing: true })
  },

  /** Removes thought id or lexeme key from the pushing and turns off isPushing if empty. */
  pushEnd: (key: string | ThoughtId) => {
    pushing.delete(key)
    if (pushing.size === 0) {
      syncStatusStore.update({ isPushing: false })
    }
  },
}

export default syncStatusStoreExtended
