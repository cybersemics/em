import { isSafari, isTouch } from '../browser'
import viewportStore from '../stores/viewport'

/** Returns true if the given element is visible within the vertical viewport. */
const isElementInViewport = (el: Element) => {
  const rect = el.getBoundingClientRect()
  const viewport = viewportStore.getState()
  return rect.top >= 0 && rect.bottom <= viewport.innerHeight
}

/** Scrolls the given element to the top 1/3 of the screen. */
const scrollIntoViewIfNeeded = (el: Element | null | undefined) => {
  if (!el || isElementInViewport(el)) return

  // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
  // Therefore, we need to calculate the scroll position ourselves

  /** The y position of the element relative to the document. */
  const y = window.scrollY + el.getBoundingClientRect().y

  const viewport = viewportStore.getState()

  /** The new y position that the element will be scrolled to, one third from the top of the screen. */
  const scrollYNew = y - viewport.innerHeight / 3

  // scroll to 1 instead of 0
  // otherwise Mobile Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  window.scrollTo(0, Math.max(1, scrollYNew))
}

/** Scrolls the cursor into view if needed. */
const scrollCursorIntoView = () => {
  // web only
  // TODO: Implement on React Native
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.querySelector) return

  // bump scroll on Mobile Safari
  // otherwise Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  if (window.scrollY === 0 && isTouch && isSafari()) {
    window.scrollBy(0, 1)
  }

  // Wait for the next render as this function is called immediately after an action is dispatched.
  // An animation frame should be enough time.
  requestAnimationFrame(() => {
    scrollIntoViewIfNeeded(document.querySelector('.editing'))
  })
}

export default scrollCursorIntoView
