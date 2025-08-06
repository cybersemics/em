/** Prevent touchmove from allowing the page to scroll when a long press is active (#3141).
 * This is different from allowScroll, which set overflow: hidden on the body in order to prevent
 * scrolling in a fixed environment such as a modal. allowScroll does not block scrolling, but it
 * does indicate to the browser that there is nowhere to scroll.
*/
import { isTouch } from '../browser'

/** Don't allow the page to scroll during touchmove. */
const preventDefault = (e: TouchEvent) => e.preventDefault()

/** Disables scrolling on the body element by preventing default on touchmove. */
const disableScroll = () => {
  document.body.addEventListener('touchmove', preventDefault, { passive: false })
}

/** Re-enables scrolling on the body element by removing the event handler that prevents default. */
const enableScroll = () => {
  document.body.removeEventListener('touchmove', preventDefault)
}

/** Enables or disables scrolling based on the parameter. */
function allowTouchToScroll(disable: boolean) {
  if (!isTouch) return
  if (disable) enableScroll()
  else disableScroll()
}

export default allowTouchToScroll
