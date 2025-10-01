import { throttle } from 'lodash'
import { isSafari, isTouch } from '../browser'
import { PREVENT_AUTOSCROLL_TIMEOUT, isPreventAutoscrollInProgress } from '../device/preventAutoscroll'
import editingValueStore from '../stores/editingValue'
import scrollTopStore from '../stores/scrollTop'
import viewportStore from '../stores/viewport'
import durations from '../util/durations'

// Tracks whether the has scrolled since the last cursor navigation
let userInteractedAfterNavigation: boolean = false

// Keep track of whether a programmatic scroll will occur in order to ignore events.
let forcedScrolling = false
let forcedScrollingTimeout: NodeJS.Timeout | undefined

/**
 * Registers a forced scroll to ignore scroll events that are triggered programmatically.
 */
const startForcedScrolling = () => {
  // Clear pending timeouts
  if (forcedScrollingTimeout) {
    clearTimeout(forcedScrollingTimeout)
  }

  forcedScrolling = true

  forcedScrollingTimeout = setTimeout(() => {
    forcedScrolling = false
  }, 50)
}

/** Scrolls the minimum amount necessary to move the viewport so that it includes the element. */
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

  // determine if the elements is above or below the viewport
  // toolbar element is not present when distractionFreeTyping is activated
  const toolbarRect = document.getElementById('toolbar')?.getBoundingClientRect()
  const toolbarBottom = toolbarRect ? toolbarRect.bottom : 0
  const navbarRect = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect()
  const viewport = viewportStore.getState()
  const isAboveViewport = y + viewport.layoutTreeTop < toolbarBottom
  const isBelowViewport = y + viewport.layoutTreeTop > viewport.innerHeight - viewport.virtualKeyboardHeight

  if (!isAboveViewport && !isBelowViewport) return

  // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
  // Therefore, we need to calculate the scroll position ourselves

  /** The y position of the element relative to the document. */
  const yOffset = viewport.layoutTreeTop + y

  // leave a margin between the element and the viewport edge equal to half the element's height
  // add offset to account for the navbar height and prevent scrolled to elements from being hidden below
  const scrollYNew = isAboveViewport
    ? yOffset - (toolbarRect?.height ?? 0) - height / 2
    : yOffset - viewport.innerHeight + viewport.virtualKeyboardHeight + height * 1.5 + (navbarRect?.height ?? 0)

  // scroll to 1 instead of 0
  // otherwise Mobile Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  const top = Math.max(1, scrollYNew)

  const scrollDistance = Math.abs(scrollYNew - window.scrollY)
  const viewportHeight = viewport.innerHeight
  const behavior = scrollDistance < viewportHeight ? 'smooth' : 'auto'

  startForcedScrolling()
  window.scrollTo({
    top,
    behavior,
  })
}

/** Scrolls the cursor into view if needed. */
const scrollCursorIntoView = (y: number, height: number) => {
  // bump scroll on Mobile Safari
  // otherwise Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  if (window.scrollY === 0 && isTouch && isSafari()) {
    startForcedScrolling()
    window.scrollBy(0, 1)
  }

  setTimeout(
    () => scrollIntoViewIfNeeded(y, height),
    // If this is the result of a navigation, wait for the layout animation to complete to not get false bounding rect values
    userInteractedAfterNavigation ? 0 : durations.get('layoutNodeAnimation'),
  )
}

// Scroll the cursor into view after it is edited, e.g. toggling bold in a long, sorted context.
editingValueStore.subscribe(
  // The cursor typically changes rank most dramatically on the first edit, and then less as its rank stabilizes.
  // Throttle aggressively since scrollCursorIntoView reads from the DOM and this is called on all edits.
  throttle(() => {
    // we need to wait for the cursor to animate into its final position before scrollCursorIntoView can accurately determine if it is in the viewport
    setTimeout(scrollCursorIntoView, durations.get('layoutNodeAnimation'))
  }, 400),
)

/**
 * Whenever the user scrolls, we set `userInteractedAfterNavigation` to true. This prevents `scrollCursorIntoView` from being called
 * after loading new thoughts.
 */
scrollTopStore.subscribe(() => {
  // Ignore scroll events that are triggered programmatically.
  if (forcedScrolling) return

  userInteractedAfterNavigation = true
})

export default scrollCursorIntoView
