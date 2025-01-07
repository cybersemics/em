import React, { useEffect, useRef } from 'react'
import { cx } from '../../styled-system/css'
import { editableRecipe } from '../../styled-system/recipes'
import Thought from '../@types/Thought'

// Create a regular expression to match and remove BEM modifier (variant) classes
const editableClass = cx(
  editableRecipe({
    preventAutoscroll: true,
  }),
).split(' ')

// Filter classes containing '--' to identify variant classes
const modifiers = editableClass.filter(cls => cls.includes('--'))

// Precompile the regex once, so it's not recreated on each render
const regexPreventAutoscroll = new RegExp(`\\b(${modifiers.join('|')})\\b`, 'g')

/**
 * Custom hook to capture and cache the static HTML string of a node. Useful for animating a thought after it has been deleted. Removes preventAutoscroll classes to avoid accidentally rendering at 0% opacity.
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
  elementRef: React.RefObject<HTMLDivElement>
}) => {
  // Cache the DOM before it is deleted
  const cachedHTMLRef = useRef<string | null>(null)

  // Capture the static innerHTML of the thought container whenever the thought changes
  useEffect(() => {
    if (thought && elementRef.current) {
      cachedHTMLRef.current = elementRef.current.innerHTML.replace(regexPreventAutoscroll, '').trim()
    }
  }, [thought, elementRef])

  return cachedHTMLRef
}

export default useCachedThoughtHtml
