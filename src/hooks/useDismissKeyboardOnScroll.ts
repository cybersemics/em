import { RefObject, useEffect } from 'react'
import { isTouch } from '../browser'

/**
 * Dismisses the virtual keyboard by blurring the input when the user scrolls on touch devices.
 * @param inputRef - Reference to the input element to blur on scroll
 */
const useDismissKeyboardOnScroll = (inputRef: RefObject<HTMLInputElement | null>) => {
  useEffect(() => {
    if (!isTouch) return

    /** Blurs the input to dismiss the virtual keyboard. */
    const handleScroll = () => {
      inputRef.current?.blur()
    }

    // Use capture phase (third argument: true) so this fires for scroll events from nested scroll containers.
    // Without capture phase, the event listener would only catch scroll events on the window itself,
    // missing scrolls from child elements that don't bubble (scroll events don't bubble).
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [inputRef])
}

export default useDismissKeyboardOnScroll
