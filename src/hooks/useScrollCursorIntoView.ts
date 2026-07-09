import { throttle } from 'lodash'
import { useEffect, useRef } from 'react'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import testFlags from '../e2e/testFlags'
import store from '../stores/app'
import editingValueStore from '../stores/editingValue'

const throttledScrollCursorIntoView = throttle((y: number, height: number) => scrollCursorIntoView(y, height), 400)

// Expose the throttled function so that tests can cancel its pending trailing call before asserting on the scroll position.
testFlags.throttledScrollCursorIntoView = throttledScrollCursorIntoView

/** Returns true if a multiselection is active. While thoughts are multiselected, the single cursor is a transient
 * artifact of executeCommandWithMulticursor iterating over (and then restoring) the cursor across each selected
 * thought. Following it with a cursor autoscroll causes a disruptive up-and-down jump, and on mobile Safari the
 * restored cursor can be scrolled behind the virtual keyboard. The single intended scroll is performed by the
 * multicursor formatting command's onComplete handler (see LayoutTree), so cursor-follow autoscroll must stand down.
 * See #3995 Issue F/H. */
const isMulticursorActive = () => Object.keys(store.getState().multicursors).length > 0

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
      // Do not autoscroll to the transient cursor while a multicursor format rewrites the selected thoughts' values.
      // The topmost selected thought is snapped into view once via the command's onComplete handler. See #3995 Issue F/H.
      if (isMulticursorActive()) return
      throttledScrollCursorIntoView(sizeRef.current.y, sizeRef.current.height)
    })
  })

  useEffect(() => {
    // Do not autoscroll to the transient cursor while a multicursor format reflows the selected thoughts' positions.
    // The topmost selected thought is snapped into view once via the command's onComplete handler. See #3995 Issue F/H.
    if (isMulticursorActive()) return
    scrollCursorIntoView(y, height)
  }, [height, y])
}

export default useScrollCursorIntoView
