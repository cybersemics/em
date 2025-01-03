import React, { useEffect, useRef } from 'react'
import { cx } from '../../styled-system/css'
import { editableRecipe } from '../../styled-system/recipes'
import Thought from '../@types/Thought'

/** Renders a thought with style. */
// TODO: These selectors can be optimized by calculating them once for all children, since they are the same among siblings. However siblings are not rendered contiguously (virtualTree), so they need to be calculated higher up.
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
    // Create a temporary container to parse the HTML string
    const container = document.createElement('div')
    container.innerHTML = htmlString

    // Get the class name for editable elements
    const editableClass = cx(
      editableRecipe({
        preventAutoscroll: true,
      }),
    ).split(' ')

    // Find all elements with the editable variant class
    const editableElements = container.querySelectorAll(`.${editableClass.join('.')}`)

    // Remove each class from the classList
    editableElements.forEach(element => {
      // Filter classes containing '--' to identify BEM modifiers and remove them
      editableClass
        .filter(cls => cls.includes('--'))
        .forEach(cls => {
          element.classList.remove(cls)
        })
    })

    // Return the cleaned HTML string
    return container.innerHTML
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
