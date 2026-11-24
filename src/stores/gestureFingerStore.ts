import ministore from './ministore'

/**
 * Where the finger drawing the current gesture is, in viewport coordinates, or null when no gesture is in progress.
 * MultiGesture writes it on every move of the gesture's own finger, so it follows the same finger the gesture does.
 * Read by the Gesture Menu's ghost to tell whether the finger is holding still. A ministore that nothing subscribes
 * to, so a write on every touchmove never renders.
 */
const gestureFingerStore = ministore({
  /** The finger's last position. */
  point: null as { x: number; y: number } | null,
})

export default gestureFingerStore
