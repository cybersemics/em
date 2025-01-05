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
const regex = new RegExp(`\\b(${modifiers.join('|')})\\b`, 'g')

/**
 * Custom hook to capture and cache the static HTML string of a node.
 *
 * @param thought - The thought object.
 * @param elementRef - The ref of the node.
 * @returns The cached HTML string.
 */
const useCachedNode = ({
  thought,
  elementRef: ref,
}: {
  thought: Thought
  elementRef: React.RefObject<HTMLDivElement>
}) => {
  // Cache the DOM before it is deleted
  const cachedHTMLRef = useRef<string | null>(null)

  /**
   * Cleans up editable classes from the provided HTML string.
   *
   * @param htmlString - The HTML string to clean up.
   * @returns The cleaned HTML string.
   */
  const cleanUpEditableClasses = (htmlString: string) => {
    // Replace BEM modifier classes with an empty string
    return htmlString.replace(regex, '').trim()
  }

  // Capture the static HTML string when the thought is first rendered
  useEffect(() => {
    if (thought && ref.current) {
      cachedHTMLRef.current = cleanUpEditableClasses(ref.current.innerHTML)
    }
  }, [thought, ref])

  return cachedHTMLRef
}

export default useCachedNode
