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

  // Capture each live render: structural changes can alter the HTML without changing the thought object.
  useEffect(() => {
    if (thought && elementRef.current) {
      cachedHTMLRef.current = elementRef.current.innerHTML.trim()
    }
  })

  return cachedHTMLRef
}

export default useCachedThoughtHtml
