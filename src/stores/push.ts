import ministore from './ministore'

const pushStore = ministore({
  // Tracks if the pushQueue is currently pushing to local or remote.
  isPushing: false,
  // Tracks if the pushQueue should be cleared on the next action.
  // See: /redux-enhancers/clearPushQueue
  invalidated: false,
})

export default pushStore
