import reactMinistore from './react-ministore'
import scrollTopStore from './scrollTop'

// Keep track of whether a programmatic scroll will occur in order to ignore events.
let isAutoScrolling = false

/**
 * Prepares the navigatedStore to ignore scroll events that are triggered programmatically.
 */
export const preventScrollDetection = () => {
  isAutoScrolling = true
  setTimeout(() => {
    isAutoScrolling = false
  }, 200)
}

/** A ministore that tracks whether the user has interacted with the page. */
const navigatedStore = reactMinistore(false)

/**
 * Whenever the user scrolls, we set `navigated` to false. This prevents `scrollCursorIntoView` from being called
 * after loading new thoughts.
 */
scrollTopStore.subscribe(() => {
  // Ignore scroll events that are triggered programmatically.
  if (isAutoScrolling) return

  navigatedStore.update(false)
})

export default navigatedStore
