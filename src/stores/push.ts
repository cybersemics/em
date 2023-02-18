import ministore from './ministore'

/** A store that tracks some pushQueue state. Updated by pushQueue only. */
const pushStore = ministore({
  // Tracks if the pushQueue is currently pushing to local or remote.
  isPushing: false,
})

export default pushStore
