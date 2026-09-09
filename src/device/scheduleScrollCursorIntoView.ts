import { throttle } from 'lodash'
import testFlags from '../e2e/testFlags'
import scrollCursorIntoView from './scrollCursorIntoView'

const throttledScrollCursorIntoView = throttle((y: number, height: number) => scrollCursorIntoView(y, height), 400)

// A scheduled scroll that has not yet reached the throttle. Held so that it can be cancelled, since cancelling the
// throttle does not stop a timer that has not fired yet from re-arming it. Only one is ever pending: a new schedule
// replaces the old one, which is equivalent since both read the size when they fire and pass through the same throttle.
let timer: ReturnType<typeof setTimeout> | undefined

/** Schedules scrollCursorIntoView on the next tick, throttled to 400 ms. The size is read when the timer fires rather
 * than when the scroll is scheduled, so that callers can defer it until React has committed the new geometry (#3083). */
const scheduleScrollCursorIntoView = (getSize: () => { y: number; height: number }) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    const { y, height } = getSize()
    throttledScrollCursorIntoView(y, height)
  })
}

/** Cancels a pending scrollCursorIntoView at every stage it can be waiting in: the tick before it reaches the throttle,
 * the throttle's trailing call, and the retry that waits for preventAutoscroll to finish. Called before an explicit
 * scroll, which supersedes any scroll the cursor had queued. */
scheduleScrollCursorIntoView.cancel = () => {
  clearTimeout(timer)
  throttledScrollCursorIntoView.cancel()
  scrollCursorIntoView.cancel()
}

// Expose the cancel so that tests can stop a scroll that the cursor has queued from moving the page after they set the scroll position.
testFlags.cancelScrollCursorIntoView = scheduleScrollCursorIntoView.cancel

export default scheduleScrollCursorIntoView
