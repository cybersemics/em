import { RefObject, useEffect } from 'react'
import { isTouch } from '../browser'

/**
 * Dismisses the virtual keyboard by blurring the input when the user scrolls with a finger drag on touch
 * devices. Triggers on the touchmove gesture (not the `scroll` event) so it ignores programmatic scrolling
 * or continued scroll events fired by inertial scrolling after the user lifts their finger.
 * @param inputRef - Reference to the input element to blur when the user scrolls.
 */
const useDismissKeyboardOnScroll = (inputRef: RefObject<HTMLInputElement | null>) => {
  useEffect(() => {
    if (!isTouch) return

    /** Blurs the input to dismiss the virtual keyboard. */
    const handleTouchMove = () => {
      inputRef.current?.blur()
    }

    // Listen for touchmove (the finger-drag scroll gesture) rather than the `scroll` event.
    // In the Command Universe, it's possible for the user to initiate an inertial scroll,
    // and then focus the search input. Scroll events continue to fire, which cause the keyboard
    // to immediately dismiss on open.
    // Checking for touchmove ensures the keyboard only closes upon a real finger drag.
    window.addEventListener('touchmove', handleTouchMove, true)

    return () => {
      window.removeEventListener('touchmove', handleTouchMove, true)
    }
  }, [inputRef])
}

export default useDismissKeyboardOnScroll
