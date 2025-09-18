import { ElementHandle } from 'puppeteer'
import { JSHandle } from 'puppeteer'
import { page } from '../setup'
import waitForAlertContent from './waitForAlertContent'

/**
 * Long press a thought and drag it to the QuickDropPanel to remove it.
 */
const dragToQuickDropPanel = async (nodeHandle: ElementHandle<Element> | JSHandle<undefined>) => {
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
    x: boundingBox.x + 1,
    y: boundingBox.y + boundingBox.height / 2,
  }

  await page.touchscreen.touchStart(coordinate.x, coordinate.y)

  // Wait for this specific bullet to be highlighted
  await page.waitForFunction(
    (bulletEl: Element) => bulletEl.getAttribute('data-highlighted') === 'true',
    { timeout: 5000 },
    bulletElement,
  )

  // Drag to QuickDropPanel
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

  // Wait for the "Drop to remove" alert
  await waitForAlertContent('Drop to remove')

  await page.touchscreen.touchEnd()
}

export default dragToQuickDropPanel
