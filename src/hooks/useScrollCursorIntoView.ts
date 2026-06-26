import { throttle } from 'lodash'
import { useEffect, useRef } from 'react'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import testFlags from '../e2e/testFlags'
import isAllSelected from '../selectors/isAllSelected'
import store from '../stores/app'
import editingValueStore from '../stores/editingValue'

const throttledScrollCursorIntoView = throttle((y: number, height: number) => scrollCursorIntoView(y, height), 400)

// Expose the throttled function so that tests can cancel its pending trailing call before asserting on the scroll position.
testFlags.throttledScrollCursorIntoView = throttledScrollCursorIntoView

/** Returns true if every thought at the cursor's level is selected (Select All). In that case the whole level is
 * already "in focus", so autoscrolling the cursor when a multicursor formatting command rewrites its value would be a
 * disruptive, pointless jump. See #3995 Issue H. */
const isSelectAllActive = () => {
  const state = store.getState()
  return Object.keys(state.multicursors).length > 0 && isAllSelected(state)
}

/** Call scrollCursorIntoView when the y position of its container changes, or when the editing value changes. */
const useScrollCursorIntoView = (y: number, height: number) => {
  const sizeRef = useRef({ y, height })

  useEffect(() => {
    // store.useEffect doesn't take a dependency array, so parameters will get stale
    sizeRef.current = { y, height }
  }, [y, height])

  // Scroll the cursor into view after it is edited, e.g. toggling bold in a long, sorted context.
  // The cursor typically changes rank most dramatically on the first edit, and then less as its rank stabilizes.
  editingValueStore.useEffect(() => {
    /** The hazard here is that editingValueStore.useEffect creates a closure around the provided values.
     * Since ministore runs synchronously, it is not possible to update dependencies before the subscribers run,
     * and it is not possible to unsubscribe/resubscribe based on new dependencies for the same reason.
     * Since sizeRef is an object, it is possible to mutate its properties within the existing closure after
     * React's render cycle runs and processes the effect above. That's why setTimeout is necessary here (#3083).
     */
    setTimeout(() => {
      // Do not autoscroll while a Select All multicursor format rewrites the cursor's value. See #3995 Issue H.
      if (isSelectAllActive()) return
      throttledScrollCursorIntoView(sizeRef.current.y, sizeRef.current.height)
    })
  })

  useEffect(() => {
    // Do not autoscroll while a Select All multicursor format reflows the cursor's position. See #3995 Issue H.
    if (isSelectAllActive()) return
    scrollCursorIntoView(y, height)
  }, [height, y])
}

export default useScrollCursorIntoView
