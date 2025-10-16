import { throttle } from 'lodash'
import { useCallback, useEffect } from 'react'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import editingValueStore from '../stores/editingValue'

const throttledScrollCursorIntoView = throttle((y: number, height: number) => scrollCursorIntoView(y, height), 400)

/** Call scrollCursorIntoView when the y position of its container changes, or when the editing value changes. */
const useScrollCursorIntoView = (y: number, height: number) => {
  const cb = useCallback(() => throttledScrollCursorIntoView(y, height), [y, height])
  // Scroll the cursor into view after it is edited, e.g. toggling bold in a long, sorted context.
  // The cursor typically changes rank most dramatically on the first edit, and then less as its rank stabilizes.
  editingValueStore.useEffect(cb)

  useEffect(() => scrollCursorIntoView(y, height), [height, y])
}

export default useScrollCursorIntoView
