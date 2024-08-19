import { useEffect, useRef, useState } from 'react'

/**
 * Determines if an element is visible.
 */
const useIsVisible = <T extends HTMLElement>(initialValue = false) => {
  const [isVisible, setIsVisible] = useState(initialValue)
  const elementRef = useRef<T | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting
      setIsVisible(visible)
    })
    const element = elementRef.current

    if (element) {
      observer.observe(element)
    }

    return () => {
      if (element) {
        observer.unobserve(element)
      }
      observer.disconnect()
    }
  }, [])

  return { isVisible, elementRef }
}

export default useIsVisible
