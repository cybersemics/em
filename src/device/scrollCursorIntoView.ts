import { isSafari, isTouch } from '../browser'
import viewportStore from '../stores/viewport'
import { PREVENT_AUTOSCROLL_TIMEOUT, isPreventAutoscrollInProgress } from './preventAutoscroll'

/** Returns true if the given element is visible within the vertical viewport. */
// const isElementInViewport = (el: Element) => {}

// Keep track of whether a programmatic scroll will occur in order to ignore events.
let autoScrolling = false
let autoScrollingTimeout: NodeJS.Timeout | undefined

/**
 * Returns true if a programmatic scroll is in progress.
 */
export const isAutoScrolling = () => autoScrolling

/**
 * Prepares the navigatedStore to ignore scroll events that are triggered programmatically.
 */
export const preventScrollDetection = () => {
  // Clear pending timeouts
  if (autoScrollingTimeout) {
    clearTimeout(autoScrollingTimeout)
  }

  autoScrolling = true

  autoScrollingTimeout = setTimeout(() => {
    autoScrolling = false
  }, 50)
}

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
  preventScrollDetection()
  window.scrollTo(0, Math.max(1, scrollYNew))
}

/** Scrolls the cursor into view if needed. */
const scrollCursorIntoView = ({
  isNavigated,
}: {
  /**
   * If this scroll is the result of a navigation, the scroll will add a longer artificial delay to not conflict with additional syncs.
   */
  isNavigated?: boolean
} = {}) => {
  // web only
  // TODO: Implement on React Native
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.querySelector) return

  // bump scroll on Mobile Safari
  // otherwise Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  if (window.scrollY === 0 && isTouch && isSafari()) {
    preventScrollDetection()
    window.scrollBy(0, 1)
  }

  // Wait for 100ms as this function is called immediately after an action is dispatched.
  // An animation frame is not enough time if multiple levels of thoughts are being pulled.
  setTimeout(
    () => {
      scrollIntoViewIfNeeded(document.querySelector('.editing'))
    },
    isNavigated ? 100 : 0,
  )
}

export default scrollCursorIntoView
