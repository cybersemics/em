import { ElementHandle, JSHandle } from 'puppeteer'
import { page } from '../session'

/**
 * Press and hold the bullet of a thought with the mouse until the long press activates, then release, which selects the thought. Long press is bound to the bullet on every platform, but to the thought itself only on touch (see Thought), so this is how a thought is selected by long press on desktop.
 */
const longPressBullet = async (nodeHandle: ElementHandle<Element> | JSHandle<undefined>) => {
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

  const boundingBox = await bulletElement.boundingBox()
  if (!boundingBox) throw new Error('Bounding box of bullet not found.')

  await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2)
  await page.mouse.down()

  // Wait for the bullet of the pressed thought to be highlighted, indicating that the long press has activated.
  await page.waitForFunction(
    (bulletEl: Element) => bulletEl.getAttribute('data-highlighted') === 'true',
    { timeout: 5000 },
    bulletElement,
  )

  await page.mouse.up()
}

export default longPressBullet
