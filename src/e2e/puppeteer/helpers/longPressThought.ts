import { ElementHandle } from 'puppeteer'
import { JSHandle } from 'puppeteer'
import { page } from '../setup'
import waitUntil from './waitUntil'

interface Options {
  /** Click on the inside edge of the editable. Default: left. */
  edge?: 'left' | 'right'
  /** Number of pixels of x offset to add to the touch coordinates, which defaults to width/2 but can be set to the left or right edge. */
  x?: number
  /** Number of pixels of y offset to add to the touch coordinates of height/2. */
  y?: number
  /** Whether to long press thought and drag to the quick drop panel. */
  quickDrop?: boolean
}

/**
 * Tap and hold a thought until a long press occurs.
 */
const longPressThought = async (
  nodeHandle: ElementHandle<Element> | JSHandle<undefined>,
  { edge = 'left', x = 0, y = 0, quickDrop = false }: Options = {},
) => {
  const boundingBox = await nodeHandle.asElement()?.boundingBox()

  if (!boundingBox) throw new Error('Bounding box of element not found.')

  // Find the specific bullet element associated with this thought
  const bulletElement = await page.evaluateHandle(editableNode => {
    if (!editableNode) throw new Error('Node handle does not contain a valid Element')

    // Find the thought container that contains this editable
    const thoughtContainer = editableNode.closest('[aria-label="thought-container"]')
    if (!thoughtContainer) throw new Error('Thought container not found')

    // Find the bullet element within this specific thought container
    const bullet = thoughtContainer.querySelector('[aria-label="bullet"]')
    if (!bullet) throw new Error('Bullet not found in thought container')

    return bullet
  }, nodeHandle)

  if (!(bulletElement instanceof ElementHandle)) throw new Error('Bullet element not found')

  const coordinate = {
    x: boundingBox.x + (edge ? (edge === 'left' ? 1 : boundingBox.width - 1) : boundingBox.width / 2) + x,
    y: boundingBox.y + boundingBox.height / 2 + y,
  }

  await page.touchscreen.touchStart(coordinate.x, coordinate.y)

  // Wait for this specific bullet to be highlighted
  await page.waitForFunction(
    (bulletEl: Element) => bulletEl.getAttribute('data-highlighted') === 'true',
    { timeout: 5000 },
    bulletElement,
  )

  if (quickDrop) {
    const viewport = await page.viewport()
    if (!viewport) throw new Error('Viewport not available')

    const quickDropPosition = {
      x: viewport.width - 16, // Center of the 2em (32px) drop zone
      y: viewport.height / 2, // Middle of the screen vertically
    }

    // Number of intermediate steps
    const steps = 10

    const deltaX = (quickDropPosition.x - coordinate.x) / steps
    const deltaY = (quickDropPosition.y - coordinate.y) / steps

    for (let i = 1; i <= steps; i++) {
      await page.touchscreen.touchMove(coordinate.x + deltaX * i, coordinate.y + deltaY * i)
    }

    await waitUntil(() => {
      const alertElement = document.querySelector('[data-testid="alert-content"]')
      return alertElement?.textContent?.includes('Drop to remove')
    })
  }

  await page.touchscreen.touchEnd()
}

export default longPressThought
