import type { Element } from 'webdriverio'
import getElementRectByScreen from './getElementRectByScreen.js'

/**
 * Press the center of an element, hold the finger still, then drag it horizontally without lifting.
 *
 * A W3C `pause` between `pointerDown` and `pointerMove` is not a reliable hold on a device: in a measured run the touch
 * started moving within 100ms of a 1000ms pause, so the press never became a long press. XCUITest's
 * `dragFromToForDuration` presses for the whole `duration` before it begins to drag.
 * Uses the global browser object from WDIO.
 */
const holdAndSwipe = async (
  element: Element,
  {
    dx,
    holdMs,
  }: {
    /** Horizontal distance to drag after the hold, in pixels. Negative drags left. */
    dx: number
    /** Milliseconds to hold the finger still before dragging. */
    holdMs: number
  },
) => {
  const rect = await getElementRectByScreen(element)
  const x = Math.round(rect.x + rect.width / 2)
  const y = Math.round(rect.y + rect.height / 2)

  await browser.execute('mobile: dragFromToForDuration', {
    duration: holdMs / 1000,
    fromX: x,
    fromY: y,
    toX: x + dx,
    toY: y,
  })
}

export default holdAndSwipe
