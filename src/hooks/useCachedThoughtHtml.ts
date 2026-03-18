import React, { useEffect, useRef } from 'react'
import Thought from '../@types/Thought'

/**
 * Custom hook to capture and cache the static HTML string of a node. Useful for animating a thought after it has been deleted.
 *
 * @param thought - The thought object.
 * @param elementRef - The ref of the Thought container element.
 * @returns The cached HTML string.
 */
const useCachedThoughtHtml = ({
  thought,
  elementRef,
}: {
  thought: Thought | undefined
  elementRef: React.RefObject<HTMLDivElement | null>
}) => {
  // Cache the DOM before it is deleted
  const cachedHTMLRef = useRef<string | null>(null)

  // Capture the static innerHTML of the thought container whenever the thought changes
  useEffect(() => {
    if (thought && elementRef.current) {
      cachedHTMLRef.current = elementRef.current.innerHTML.trim()
    }
  }, [thought, elementRef])

  return cachedHTMLRef
}

export default useCachedThoughtHtml
