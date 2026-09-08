import ministore from './ministore'

/**
 * A ministore that latches `true` while a multi-touch gesture (e.g. two-finger tracing or pinch-to-zoom) is
 * in progress. It is set `true` as soon as a second finger touches the screen and stays `true` until a fresh
 * single-finger interaction begins.
 *
 * Latching — rather than tracking the live touch count — is essential for three reasons: (1) during a pinch or
 * two-finger trace one finger frequently lifts slightly before the other, so a live count would momentarily
 * drop to 1 and let react-dnd's TouchBackend begin a drag from the remaining finger; (2) a second finger can
 * join *after* a single-finger gesture has begun, and the gesture must then be abandoned; (3) the terminating
 * tap/click of a multi-touch gesture must still read `true` so it does not move the cursor. The latch is only
 * reset when the first finger of a brand-new interaction touches down. Consumed by the drag, gesture, and
 * cursor-set subsystems. See #4233.
 */
const multitouchStore = ministore(false)

/**
 * Updates the multitouch latch from a TouchEvent. Bound to touchstart/touchend/touchcancel. Latches `true` when
 * a second finger is down, and resets to `false` only when the first finger of a fresh interaction touches down
 * (touchstart with exactly one active touch). It is intentionally NOT cleared on touchend, so the latch persists
 * through the terminating tap/click of a multi-touch gesture (which would otherwise move the cursor or fire a
 * gesture/drag).
 */
export const updateMultitouch = (e: TouchEvent) => {
  if (e.touches.length >= 2) {
    multitouchStore.update(true)
  } else if (e.type === 'touchstart' && e.touches.length === 1) {
    multitouchStore.update(false)
  }
}

export default multitouchStore
