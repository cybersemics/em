import ministore from './ministore'

/**
 * A ministore that latches `true` while a multi-touch gesture (e.g. two-finger tracing or pinch-to-zoom) is
 * in progress. It is set `true` as soon as a second finger touches the screen and is only reset to `false`
 * once every finger has lifted.
 *
 * Latching — rather than tracking the live touch count — is essential: during a pinch or two-finger trace one
 * finger frequently lifts slightly before the other, so a live count would momentarily drop to 1 and let
 * react-dnd's TouchBackend begin a drag from the remaining finger. The latch stays set for the whole gesture,
 * closing that window. Used to reject multi-touch input that should not be interpreted as a drag or long press.
 * See #4233.
 */
const multitouchStore = ministore(false)

/**
 * Updates the multitouch latch from a TouchEvent. Bound to touchstart/touchend/touchcancel. Latches `true` when
 * a second finger is down, and clears only when the last finger lifts (touches.length === 0). A single remaining
 * touch (touches.length === 1) leaves the latch unchanged so it persists until the whole gesture ends.
 */
export const updateMultitouch = (e: TouchEvent) => {
  if (e.touches.length >= 2) {
    multitouchStore.update(true)
  } else if (e.touches.length === 0) {
    multitouchStore.update(false)
  }
}

export default multitouchStore
