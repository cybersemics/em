import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import Path from '../@types/Path'
import State from '../@types/State'
import { LAYOUT_NODE_ANIMATION_DURATION } from '../constants'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import editingValueStore from '../stores/editingValue'

// store the last cursor
let cursorLast: Path | null = null

// Scroll the cursor into view after it is edited, e.g. toggling bold in a long, sorted context.
editingValueStore.subscribe(
  // The cursor typically changes rank most dramatically on the first edit, and then less as its rank stabilizes.
  // Throttle aggressively since scrollCursorIntoView reads from the DOM and this is called on all edits.
  _.throttle(() => {
    // we need to wait for the cursor to animate into its final position before scrollCursorIntoView can accurately determine if it is in the viewport
    setTimeout(scrollCursorIntoView, LAYOUT_NODE_ANIMATION_DURATION)
  }, 400),
)

/** Runs a throttled session keepalive on every action. */
const scrollCursorIntoViewMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)

    // if the cursor has changed, scroll it into view
    const cursor = getState().cursor
    if (cursor !== cursorLast) {
      scrollCursorIntoView()
    }
    cursorLast = cursor
  }
}

export default scrollCursorIntoViewMiddleware
