import { RefObject, useEffect, useRef, useState } from 'react'
import scrollTopStore from '../stores/scrollTop'

/**
 * Determines if an element is partially visible in the viewport.
 */
const useIsVisible = <T extends HTMLElement>(
  /** The initial visibility state of the element. */
  initialValue = false,
): [boolean, React.RefObject<T>] => {
  const [isVisible, setIsVisible] = useState(initialValue)
  const elementRef = useRef<T | null>(null)

  /** Determines if the element is visible in the viewport. */
  const checkVisibility = () => {
    const element = elementRef.current

    if (element) {
      const rect = element.getBoundingClientRect()
      const top = rect.top < window.innerHeight
      const bottom = rect.bottom > 0
      const left = rect.left < window.innerWidth
      const right = rect.right > 0
      const visible = top && bottom && left && right
      setIsVisible(visible)
    }
  }

  scrollTopStore.useEffect(checkVisibility)

  useEffect(() => {
    checkVisibility()
    window.addEventListener('resize', checkVisibility)

    return () => {
      window.removeEventListener('resize', checkVisibility)
    }
  }, [])

  return [isVisible, elementRef as RefObject<T>]
}

export default useIsVisible
