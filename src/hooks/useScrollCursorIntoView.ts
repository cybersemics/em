import { throttle } from 'lodash'
import { useCallback, useEffect, useRef } from 'react'
import VirtualKeyboardState from '../@types/VirtualKeyboardState'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import testFlags from '../e2e/testFlags'
import editingValueStore from '../stores/editingValue'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

/** Selects the keyboard's target height, which changes exactly once per keyboard event (open, close, resize). */
const selectKeyboardTargetHeight = (state: VirtualKeyboardState) => state.targetHeight

const throttledScrollCursorIntoView = throttle((y: number, height: number) => scrollCursorIntoView(y, height), 400)

// Expose the throttled function so that tests can cancel its pending trailing call before asserting on the scroll position.
testFlags.throttledScrollCursorIntoView = throttledScrollCursorIntoView

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

  /** Re-checks the scroll position with the cursor's current size. */
  const onKeyboardChange = useCallback(() => {
    scrollCursorIntoView(sizeRef.current.y, sizeRef.current.height)
  }, [])

  // Re-check when the keyboard opens, closes, or resizes (e.g. the prediction bar toggling): the
  // bottom trigger edge moves with the keyboard, so a cursor that was comfortably visible at tap
  // time can end up underneath it. The keyboard height arrives *after* the [y, height] effect
  // below has already run, so without this subscription a tap on a thought that the keyboard is
  // about to cover never triggers a scroll (#3765).
  //
  // targetHeight changes once per keyboard movement — Capacitor delivers the final height
  // upfront, and iOSSafariHandler emulates the same one-shot semantics by publishing a predicted
  // final height — so this fires immediately when the keyboard starts moving and the scroll
  // animates concurrently with the keyboard slide. Do not subscribe to the spring-animated
  // `height`, which changes every animation frame and would restart the scroll repeatedly.
  //
  // Needed on all iOS platforms, not just the Capacitor WebView (which has no native keyboard
  // reveal due to Keyboard resize: 'none'): in mobile Safari, focusWithoutAutoscroll suppresses
  // WebKit's own reveal-on-keyboard-open along with the focus/selection autoscroll, so em owns
  // the reveal everywhere.
  virtualKeyboardStore.useSelectorEffect(onKeyboardChange, selectKeyboardTargetHeight)

  useEffect(() => scrollCursorIntoView(y, height), [height, y])
}

export default useScrollCursorIntoView
