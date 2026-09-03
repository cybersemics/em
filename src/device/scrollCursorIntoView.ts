import { isSafari, isTouch } from '../browser'
import { PREVENT_AUTOSCROLL_TIMEOUT, isPreventAutoscrollInProgress } from '../device/preventAutoscroll'
import viewportStore from '../stores/viewport'
import autoscrollBounds from './autoscrollBounds'

/** Scrolls the minimum amount necessary to move the cursor into the autoscroll comfort zone. */
const scrollIntoViewIfNeeded = (y: number, height: number) => {
  // preventAutoscroll works by briefly increasing the element's height, which breaks isElementInViewport.
  // Therefore, we need to wait until preventAutoscroll is done.
  // See: preventAutoscroll.ts
  if (isPreventAutoscrollInProgress()) {
    setTimeout(() => {
      scrollIntoViewIfNeeded(y, height)
    }, PREVENT_AUTOSCROLL_TIMEOUT)
    return
  }

  const viewport = viewportStore.getState()
  const bounds = autoscrollBounds()

  /** The y position of the element relative to the document. */
  const yDocument = viewport.layoutTreeTop + y

  /** The y position of the element relative to the viewport. */
  const yViewport = yDocument - window.scrollY

  const crossedTop = yViewport < bounds.top
  const crossedBottom = yViewport + height > bounds.bottom

  if (!crossedTop && !crossedBottom) return

  // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
  // Therefore, we need to calculate the scroll position ourselves

  // Both offsets are measured from the cursor's top edge. The bottom offset therefore includes the
  // cursor's full height plus the same half-height landing distance used at the top.
  const topLandingOffset = height * 0.5
  const bottomLandingOffset = height * 1.5
  const scrollYNew = crossedTop
    ? yDocument - bounds.toolbarHeight - topLandingOffset
    : yDocument - bounds.visibleHeight + bottomLandingOffset + bounds.navbarHeight

  // An edge can be crossed even when the document has no room to move. Clamp to a reachable target
  // and leave genuine no-ops alone rather than manufacturing Safari's protective 1px floor.
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  const target = Math.min(Math.max(scrollYNew, 0), maxScroll)
  if (target === window.scrollY) return

  // scroll to 1 instead of 0
  // otherwise Mobile Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  const top = Math.max(1, target)
  if (top === window.scrollY) return

  const scrollDistance = Math.abs(scrollYNew - window.scrollY)
  const behavior: ScrollBehavior = scrollDistance < bounds.visibleHeight ? 'smooth' : 'auto'

  window.scrollTo({
    top,
    behavior: navigator.webdriver ? 'instant' : behavior,
  })
}

/** Scrolls the cursor into view if needed. */
const scrollCursorIntoView = (y: number, height: number) => {
  // bump scroll on Mobile Safari
  // otherwise Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  if (window.scrollY === 0 && isTouch && isSafari()) {
    window.scrollBy(0, 1)
  }

  scrollIntoViewIfNeeded(y, height)
}

export default scrollCursorIntoView
