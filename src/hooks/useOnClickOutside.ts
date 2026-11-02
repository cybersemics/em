import { RefObject, useEffect } from 'react'

/**
 * A custom hook that calls the `handler` function with the press event when the user clicks/taps outside the element
 * referenced by ref. Presses inside the element, including its descendants, are ignored.
 */
const useOnClickOutside = (ref: RefObject<HTMLElement | null>, handler: (event: MouseEvent | TouchEvent) => void) => {
  useEffect(() => {
    /** Calls handler if the event target is outside the referenced element. */
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return
      handler(e)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener, { passive: true })
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

export default useOnClickOutside
