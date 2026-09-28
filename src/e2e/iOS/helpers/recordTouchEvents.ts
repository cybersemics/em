/** A touch event as the page received it. */
export interface TouchEventRecord {
  type: 'touchstart' | 'touchend' | 'touchcancel'
  /** When the page received the event, from performance.now(). */
  receivedAt: number
  /** The event's own timeStamp, on the same clock as receivedAt. */
  timeStamp: number
}

/**
 * Starts recording every touchstart, touchend, and touchcancel the page receives, for a test whose subject is how the
 * platform delivers touch events. Read the record with waitForTouchesToEnd. The listeners are passive and capture on
 * window, so they cannot change what the app receives. The record lasts until the page reloads.
 */
const recordTouchEvents = async () => {
  await browser.execute(() => {
    const record: TouchEventRecord[] = []
    ;(window as unknown as { __touchEvents: TouchEventRecord[] }).__touchEvents = record
    for (const type of ['touchstart', 'touchend', 'touchcancel'] as const) {
      window.addEventListener(type, e => record.push({ type, receivedAt: performance.now(), timeStamp: e.timeStamp }), {
        capture: true,
        passive: true,
      })
    }
  })
}

export default recordTouchEvents
