import { isEqual, throttle } from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import { isSafari, isTouch } from '../browser'
import { PREVENT_AUTOSCROLL_TIMEOUT, isPreventAutoscrollInProgress } from '../device/preventAutoscroll'
import getSortPreference from '../selectors/getSortPreference'
import rootedParentOf from '../selectors/rootedParentOf'
import editingValueStore from '../stores/editingValue'
import scrollTopStore from '../stores/scrollTop'
import syncStatusStore from '../stores/syncStatus'
import viewportStore from '../stores/viewport'
import durations from '../util/durations'
import head from '../util/head'

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
  const navbarRect = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect()
  const viewport = viewportStore.getState()
  const isAboveViewport = rect.top < toolbarBottom
  const isBelowViewport = rect.bottom > viewport.innerHeight - viewport.virtualKeyboardHeight

  if (!isAboveViewport && !isBelowViewport) return

  // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
  // Therefore, we need to calculate the scroll position ourselves

  /** The y position of the element relative to the document. */
  const y = window.scrollY + rect.y

  // leave a margin between the element and the viewport edge equal to half the element's height
  // add offset to account for the navbar height and prevent scrolled to elements from being hidden below
  const scrollYNew = isAboveViewport
    ? y - (toolbarRect?.height ?? 0) - rect.height / 2
    : y - viewport.innerHeight + viewport.virtualKeyboardHeight + rect.height * 1.5 + (navbarRect?.height ?? 0)

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
const scrollCursorIntoView = () => {
  // web only
  // TODO: Implement on React Native
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.querySelector) return

  // bump scroll on Mobile Safari
  // otherwise Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  if (window.scrollY === 0 && isTouch && isSafari()) {
    startForcedScrolling()
    window.scrollBy(0, 1)
  }

  setTimeout(
    () => {
      // soft fail if document is undefined which can happen in tests for some reason
      if (typeof document === 'undefined') {
        console.warn(
          'document is not defined. This probably means that the timers from an async operation or middleware were not run to completion in a test.',
        )
        return
      }

      scrollIntoViewIfNeeded(document.querySelector('[data-editing=true]'))
    },
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

// store the previous isPulling value, to only invoke scrollCursorIntoView when it changes to `false`
let prevIsPulling: boolean | null = null
/**
 * Scroll the cursor into view if the sync was the result of navigation to a thought.
 */
syncStatusStore.subscribe(state => {
  if (!state.isPulling && prevIsPulling && !userInteractedAfterNavigation) {
    scrollCursorIntoView()
  }

  prevIsPulling = state.isPulling
})

/**
 * Whenever the user scrolls, we set `userInteractedAfterNavigation` to true. This prevents `scrollCursorIntoView` from being called
 * after loading new thoughts.
 */
scrollTopStore.subscribe(() => {
  // Ignore scroll events that are triggered programmatically.
  if (forcedScrolling) return

  userInteractedAfterNavigation = true
})

/** Runs a throttled session keepalive on every action. */
const scrollCursorIntoViewMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    const stateOld = getState()
    const cursorOld = stateOld.cursor
    const sortPreferenceOld =
      stateOld.cursor && getSortPreference(stateOld, head(rootedParentOf(stateOld, stateOld.cursor)))

    next(action)

    // if the cursor has changed, scroll it into view
    const stateNew = getState()
    const cursorNew = stateNew.cursor
    const sortPreferenceNew =
      stateNew.cursor && getSortPreference(stateNew, head(rootedParentOf(stateNew, stateNew.cursor)))

    const cursorChanged = !isEqual(cursorNew, cursorOld)
    const sortChanged = !isEqual(sortPreferenceNew, sortPreferenceOld)
    if (cursorChanged || sortChanged) {
      setTimeout(
        () => {
          // indicate that the cursor has changed and we want to scroll it into view
          // this is needed for when thoughts need to be pulled from storage prior to scrolling
          userInteractedAfterNavigation = false
          scrollCursorIntoView()
        },
        // If the cursor changed, we need to wait for most of the layout animaton to complete before scrolling.
        // Otherwise the cursor will not be at its final position and it will nott scroll far enough.
        // 50% seems to be enough to avoid the issue, but this can be fine-tuned as needed.
        sortChanged ? durations.get('layoutNodeAnimation') / 2 : 0,
      )
    }
  }
}

export default scrollCursorIntoViewMiddleware
