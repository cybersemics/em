/** Prevent touchmove from allowing the page to scroll when a long press is active (#3141). */
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
