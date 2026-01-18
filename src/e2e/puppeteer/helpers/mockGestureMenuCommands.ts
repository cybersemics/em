import { page } from '../setup'

/**
 * Mocks the commands displayed in the GestureMenu by directly manipulating the DOM.
 * This replaces real command labels and descriptions with stable test fixtures to prevent
 * snapshot failures when command gestures change.
 *
 * The mock commands maintain the same structure as real commands but with fixed labels:
 * - Test Command 1, Test Command 2, etc.
 * - Preserves special commands like "Gesture Cheatsheet" and "Cancel" at the end.
 */
const mockGestureMenuCommands = async (): Promise<void> => {
  await page.evaluate(() => {
    /** Polls for the gesture menu and replaces command text with test fixtures. */
    const pollForMenu = () => {
      return new Promise<void>(resolve => {
        /** Checks if the menu is ready and performs the replacement. */
        const checkMenu = () => {
          const popup = document.querySelector('[data-testid="popup-value"]')
          if (popup) {
            // Find all command items by looking for elements with the command structure
            // Commands are rendered as flex containers with labels (b tags) and descriptions (p tags)
            const commandContainers = Array.from(popup.querySelectorAll('b')).map(b => b.parentElement?.parentElement)

            let commandIndex = 1
            commandContainers.forEach(container => {
              if (!container) return

              // Find the label (b tag)
              const labelElement = container.querySelector('b')
              // Find the description (p tag)
              const descriptionElement = container.querySelector('p')

              if (labelElement) {
                const originalLabel = labelElement.textContent || ''

                // Keep special commands unchanged
                if (originalLabel.includes('Gesture Cheatsheet') || originalLabel.includes('Cancel')) {
                  // Don't modify these special commands
                  return
                }

                // Replace with test command labels
                labelElement.textContent = `Test Command ${commandIndex}`

                if (descriptionElement) {
                  descriptionElement.textContent = `Test command ${commandIndex} description`
                }

                commandIndex++
              }
            })

            resolve()
          } else {
            setTimeout(checkMenu, 50)
          }
        }
        checkMenu()
      })
    }

    return pollForMenu()
  })
}

export default mockGestureMenuCommands
