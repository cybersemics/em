import { RefObject, useEffect } from 'react'
import { isTouch } from '../browser'

/**
 * Dismisses the virtual keyboard by blurring the input when the user scrolls with a finger drag on touch
 * devices. Triggers on the touchmove gesture (not the `scroll` event) so it ignores programmatic scrolling
 * such as the Command Universe resetting the list to the top on each keystroke.
 * @param inputRef - Reference to the input element to blur when the user scrolls.
 */
const useDismissKeyboardOnScroll = (inputRef: RefObject<HTMLInputElement | null>) => {
  useEffect(() => {
    if (!isTouch) return

    /** Blurs the input to dismiss the virtual keyboard. */
    const handleTouchMove = () => {
      inputRef.current?.blur()
    }

    // Listen for touchmove (the finger-drag scroll gesture) rather than the `scroll` event. A `scroll`
    // listener can't distinguish a user scroll from a programmatic one, and the Command Universe scrolls
    // the list back to the top on every keystroke (DialogContent's scrollResetKey) — that programmatic
    // scrollTo would otherwise blur the input and dismiss the keyboard the instant the user types while
    // scrolled down. touchmove only fires on a real finger drag, so the keyboard is dismissed exactly when
    // the user starts scrolling and never when typing.
    window.addEventListener('touchmove', handleTouchMove, true)

    return () => {
      window.removeEventListener('touchmove', handleTouchMove, true)
    }
  }, [inputRef])
}

export default useDismissKeyboardOnScroll
