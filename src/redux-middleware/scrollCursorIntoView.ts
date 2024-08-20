import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import Path from '../@types/Path'
import State from '../@types/State'
import { LAYOUT_NODE_ANIMATION_DURATION } from '../constants'
import scrollCursorIntoView, { isAutoScrolling } from '../device/scrollCursorIntoView'
import editingValueStore from '../stores/editingValue'
import scrollTopStore from '../stores/scrollTop'
import syncStatusStore from '../stores/syncStatus'

// store the last cursor
let cursorLast: Path | null = null

// Tracks whether the cursor has changed as a result of navigation to a thought
let navigated: boolean = false

// Scroll the cursor into view after it is edited, e.g. toggling bold in a long, sorted context.
editingValueStore.subscribe(
  // The cursor typically changes rank most dramatically on the first edit, and then less as its rank stabilizes.
  // Throttle aggressively since scrollCursorIntoView reads from the DOM and this is called on all edits.
  _.throttle(() => {
    // we need to wait for the cursor to animate into its final position before scrollCursorIntoView can accurately determine if it is in the viewport
    setTimeout(scrollCursorIntoView, LAYOUT_NODE_ANIMATION_DURATION)
  }, 400),
)

/**
 * Scroll the cursor into view if the sync was the result of navigation to a thought.
 */
syncStatusStore.subscribe(state => {
  if (!state.isPulling && navigated) {
    scrollCursorIntoView({ isNavigated: true })
  }
})

/**
 * Whenever the user scrolls, we set `navigated` to false. This prevents `scrollCursorIntoView` from being called
 * after loading new thoughts.
 */
scrollTopStore.subscribe(() => {
  // Ignore scroll events that are triggered programmatically.
  if (isAutoScrolling()) return

  navigated = false
})

/** Runs a throttled session keepalive on every action. */
const scrollCursorIntoViewMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)

    // if the cursor has changed, scroll it into view
    const cursor = getState().cursor
    if (cursor !== cursorLast) {
      // indicate that the cursor has changed and we want to scroll it into view
      // this is needed for when thoughts need to be pulled from storage prior to scrolling
      navigated = true
      scrollCursorIntoView({ isNavigated: true })
    }
    cursorLast = cursor
  }
}

export default scrollCursorIntoViewMiddleware
