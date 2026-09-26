import { useCallback, useEffect, useRef } from 'react'
import VirtualKeyboardState from '../@types/VirtualKeyboardState'
import scheduleScrollCursorIntoView from '../device/scheduleScrollCursorIntoView'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import editingValueStore from '../stores/editingValueStore'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

/** Selects whether the virtual keyboard is open. */
const selectKeyboardOpen = (state: VirtualKeyboardState) => state.open

/** Call scrollCursorIntoView when the y position of its container changes, or when the editing value changes. */
const useScrollCursorIntoView = (y: number, height: number) => {
  const sizeRef = useRef({ y, height })

  useEffect(() => {
    // store.useEffect doesn't take a dependency array, so parameters will get stale
    sizeRef.current = { y, height }
  }, [y, height])

  // The virtual keyboard covers the bottom of the screen without moving the cursor, so the [y, height] effect below
  // does not re-run when it opens and the caret is simply left underneath it.
  const scrollForKeyboard = useCallback(() => {
    scrollCursorIntoView(sizeRef.current.y, sizeRef.current.height)
  }, [])
  virtualKeyboardStore.useSelectorEffect(scrollForKeyboard, selectKeyboardOpen)

  // Scroll the cursor into view after it is edited, e.g. toggling bold in a long, sorted context.
  // The cursor typically changes rank most dramatically on the first edit, and then less as its rank stabilizes.
  editingValueStore.useEffect(() => {
    /** The hazard here is that editingValueStore.useEffect creates a closure around the provided values.
     * Since ministore runs synchronously, it is not possible to update dependencies before the subscribers run,
     * and it is not possible to unsubscribe/resubscribe based on new dependencies for the same reason.
     * Since sizeRef is an object, it is possible to mutate its properties within the existing closure after
     * React's render cycle runs and processes the effect above. That's why scheduleScrollCursorIntoView reads the size
     * on the next tick rather than now (#3083).
     */
    scheduleScrollCursorIntoView(() => sizeRef.current)
  })

  useEffect(() => scrollCursorIntoView(y, height), [height, y])
}

export default useScrollCursorIntoView
