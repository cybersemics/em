import ministore from './ministore'

/** A store that tracks state related to syncing. Updated by yjs/thouguhtspace. */
const pushStore = ministore({
  // Tracks if the pushQueue is currently pushing to IndexedDB.
  isPushing: false,
})

export default pushStore
