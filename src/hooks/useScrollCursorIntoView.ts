import { throttle } from 'lodash'
import { useCallback, useEffect, useRef } from 'react'
import VirtualKeyboardState from '../@types/VirtualKeyboardState'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import testFlags from '../e2e/testFlags'
import editingValueStore from '../stores/editingValue'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

const throttledScrollCursorIntoView = throttle((y: number, height: number) => scrollCursorIntoView(y, height), 400)

// Expose the throttled function so that tests can cancel its pending trailing call before asserting on the scroll position.
testFlags.throttledScrollCursorIntoView = throttledScrollCursorIntoView

/** Selects the virtual keyboard's open state. Defined at module scope so its identity is stable across renders. */
const selectVirtualKeyboardOpen = (state: VirtualKeyboardState) => state.open

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

  // Re-scroll the cursor into view when the virtual keyboard opens.
  // On iOS Capacitor, tapping the cursor thought to enter edit mode opens the keyboard without changing the
  // cursor's y/height or its editing value, so neither effect above fires. Without this, a thought near the
  // bottom of the screen stays hidden behind the newly-opened keyboard. scrollCursorIntoView now accounts for
  // the keyboard height, so re-running it once the keyboard opens lifts the thought above the keyboard (#3705).
  const scrollOnKeyboardChange = useCallback(
    () => throttledScrollCursorIntoView(sizeRef.current.y, sizeRef.current.height),
    [],
  )
  virtualKeyboardStore.useSelectorEffect(scrollOnKeyboardChange, selectVirtualKeyboardOpen)

  useEffect(() => scrollCursorIntoView(y, height), [height, y])
}

export default useScrollCursorIntoView
