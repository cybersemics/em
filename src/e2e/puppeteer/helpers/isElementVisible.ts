import { page } from '../setup'

/**
 * Checks if an element with the given text content is visible in the UI.
 *
 * This function checks not only if the element exists in the DOM, but also.
 * 1. If it or any parent has CSS properties that would hide it (display: none, visibility: hidden, opacity: 0).
 * 2. If it has non-zero dimensions in the viewport.
 *
 * @param text The exact text content to search for.
 * @param selector The CSS selector to search within (defaults to '[data-editable]', which selects thoughts).
 * @returns Promise<boolean> True if the element is visible, false otherwise.
 */
const isElementVisible = async (text: string, selector = '[data-editable]'): Promise<boolean> => {
  try {
    return await page.evaluate(
      (text, selector) => {
        const elements = Array.from(document.querySelectorAll(selector))
        const element = elements.find(el => el.innerHTML === text)

        // If element doesn't exist, it's not visible
        if (!element) return false

        // Check if the element or any of its parents has display: none or visibility: hidden
        let currentNode: Element | null = element
        while (currentNode) {
          const style = window.getComputedStyle(currentNode)
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false
          }
          // Move up to parent node
          currentNode = currentNode.parentElement
        }

        // Check if element is in viewport and has non-zero dimensions
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      },
      text,
      selector,
    )
  } catch (error) {
    console.error(`Error checking visibility of "${text}":`, error)
    return false
  }
}

export default isElementVisible
