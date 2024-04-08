import { isSafari, isTouch } from '../browser'
import viewportStore from '../stores/viewport'
import { PREVENT_AUTOSCROLL_TIMEOUT, isPreventAutoscrollInProgress } from './preventAutoscroll'

/** Returns true if the given element is visible within the vertical viewport. */
// const isElementInViewport = (el: Element) => {}

/** Scrolls the minimum amount necessary to move the viewport so that it includes the element. */
const scrollIntoViewIfNeeded = (el: Element | null | undefined) => {
  // preventAutoscroll works by briefly increasing the element's height, which breaks isElementInViewport.
  // Therefore, we need to wait until preventAutoscroll is done.
  // See: preventAutoscroll.ts
  if (isPreventAutoscrollInProgress()) {
    setTimeout(() => {
      scrollIntoViewIfNeeded(el)
    }, PREVENT_AUTOSCROLL_TIMEOUT)
    return
  }

  if (!el) return

  // determine if the elements is above or below the viewport
  const rect = el.getBoundingClientRect()
  // toolbar element is not present when distractionFreeTyping is activated
  const toolbarRect = document.getElementById('toolbar')?.getBoundingClientRect()
  const toolbarBottom = toolbarRect ? toolbarRect.bottom : 0
  const viewport = viewportStore.getState()
  const isAboveViewport = rect.top < toolbarBottom
  const isBelowViewport = rect.bottom > viewport.innerHeight - viewport.virtualKeyboardHeight

  if (!isAboveViewport && !isBelowViewport) return

  // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
  // Therefore, we need to calculate the scroll position ourselves

  /** The y position of the element relative to the document. */
  const y = window.scrollY + rect.y

  // leave a margin between the element and the viewport edge equal to half the element's height
  const scrollYNew = isAboveViewport
    ? y - (toolbarRect?.height ?? 0) - rect.height / 2
    : y - viewport.innerHeight + viewport.virtualKeyboardHeight + rect.height * 1.5

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
