import ministore from './ministore'

/** A ministore that tracks the number of touch points currently on the screen. Used to reject multi-touch input (e.g. two-finger tracing) that should not be interpreted as a drag or gesture. See #4233. */
const multitouchStore = ministore(0)

/** Updates the active touch count from a TouchEvent. Bound to touchstart/touchend/touchcancel so that the count always reflects the number of fingers currently on the screen. */
export const updateActiveTouches = (e: TouchEvent) => {
  multitouchStore.update(e.touches.length)
}

export default multitouchStore
