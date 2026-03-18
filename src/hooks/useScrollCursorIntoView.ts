import { throttle } from 'lodash'
import { useEffect, useRef } from 'react'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import editingValueStore from '../stores/editingValue'

const throttledScrollCursorIntoView = throttle((y: number, height: number) => scrollCursorIntoView(y, height), 400)

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
    setTimeout(() => throttledScrollCursorIntoView(sizeRef.current.y, sizeRef.current.height))
  })

  useEffect(() => scrollCursorIntoView(y, height), [height, y])
}

export default useScrollCursorIntoView
