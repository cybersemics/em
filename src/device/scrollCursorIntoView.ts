import { isCapacitor, isIOS, isSafari, isTouch } from '../browser'
import { PREVENT_AUTOSCROLL_TIMEOUT, isPreventAutoscrollInProgress } from '../device/preventAutoscroll'
import viewportStore from '../stores/viewportStore'
import debugLog from '../util/debugLog'
import getVisibleBounds from './getVisibleBounds'

// A scroll that is waiting for preventAutoscroll to finish. Held so that it can be cancelled, since it is a scroll that has been decided on but not yet performed.
let preventAutoscrollTimer: ReturnType<typeof setTimeout> | undefined

/** Scrolls the minimum amount necessary to move the viewport so that it includes the element. */
const scrollIntoViewIfNeeded = (y: number, height: number) => {
  // preventAutoscroll works by briefly increasing the element's height, which breaks isElementInViewport.
  // Therefore, we need to wait until preventAutoscroll is done.
  // See: preventAutoscroll.ts
  if (isPreventAutoscrollInProgress()) {
    preventAutoscrollTimer = setTimeout(() => {
      scrollIntoViewIfNeeded(y, height)
    }, PREVENT_AUTOSCROLL_TIMEOUT)
    return
  }

  // determine if the elements is above or below the viewport
  const {
    top: toolbarBottom,
    bottom: bottomBoundary,
    toolbarHeight,
    keyboardOpen,
    visualViewportHeight,
    effectiveViewportHeight,
  } = getVisibleBounds()
  const viewport = viewportStore.getState()

  /** The y position of the element relative to the document. */
  const yDocument = viewport.layoutTreeTop + y

  /** The y position of the element relative to the viewport. */
  const yViewport = yDocument - window.scrollY

  const isAboveViewport = yViewport < toolbarBottom
  const isBelowViewport = yViewport + height > bottomBoundary

  if (!isAboveViewport && !isBelowViewport) return

  // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
  // Therefore, we need to calculate the scroll position ourselves

  // leave a margin between the element and the viewport edge equal to half the element's height
  // add offset to account for the navbar height and prevent scrolled to elements from being hidden below
  // When scrolling an element above the viewport into view, target a position just below the toolbar.
  // The toolbar is offset from the top of the WebView by the safe-area inset on iOS Capacitor, so we must use
  // toolbarBottom (which includes the inset) rather than the toolbar height; otherwise the element is scrolled
  // behind the toolbar, which causes the cursor to be pinned near the top and the list to scroll up repeatedly. (#4326)
  const aboveOffset = isIOS && isCapacitor() ? toolbarBottom : toolbarHeight
  const scrollYNew = isAboveViewport ? yDocument - aboveOffset - height / 2 : yDocument - bottomBoundary + height * 1.5

  // scroll to 1 instead of 0
  // otherwise Mobile Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  const top = Math.max(1, scrollYNew)

  const scrollDistance = Math.abs(scrollYNew - window.scrollY)
  const behavior: ScrollBehavior = scrollDistance < visualViewportHeight ? 'smooth' : 'auto'

  // Record the inputs to the scroll decision, so a cursor scrolled to the wrong place can be checked against where the
  // cursor was and what bounded it. Every value is one this function already computed, except scrollHeight, which
  // is free here: window.scrollY and the navbar rect above, read on every path, have just brought layout up to date,
  // and nothing has written to the DOM since. It shows whether the browser will clamp the target at the bottom of the
  // document. The scroll itself is recorded by the viewport scrollStart and scrollEnd entries that follow.
  debugLog.log('scroll', () => ({
    source: 'cursor',
    y,
    height,
    layoutTreeTop: viewport.layoutTreeTop,
    scrollY: Math.round(window.scrollY),
    yViewport: Math.round(yViewport),
    toolbarBottom: Math.round(toolbarBottom),
    // which of the two viewport heights bounded the cursor: the iOS Capacitor keyboard branch or visualViewport
    keyboardOpen,
    visualViewportHeight: Math.round(visualViewportHeight),
    effectiveViewportHeight: Math.round(effectiveViewportHeight),
    bottomBoundary: Math.round(bottomBoundary),
    scrollHeight: document.documentElement.scrollHeight,
    direction: isAboveViewport ? 'up' : 'down',
    top: Math.round(top),
    behavior,
  }))

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

/** Cancels a scroll that is waiting for preventAutoscroll to finish. Does not affect a scroll that has already been performed. */
scrollCursorIntoView.cancel = () => clearTimeout(preventAutoscrollTimer)

export default scrollCursorIntoView
