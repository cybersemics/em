import { ElementHandle } from 'puppeteer'
import { page } from '../session'
import waitForAlert from './waitForAlert'
import waitForEditable from './waitForEditable'

interface Options {
  /** Determines where the source thought is dropped, relative to the destination thought.
  - before: drop the source thought as a sibling before the destination thought.
  - after: drop the source thought as a sibling after the destination thought.
   */
  position: 'after' | 'before'
}

/**
 * Drags and drops a thought with touch input, as react-dnd's TouchBackend receives it on mobile. Long presses the source
 * thought until its bullet reports the drag has begun, drags to the destination thought, and releases.
 *
 * Distinct from dragAndDropThought, which drives mouse input and thus only exercises the HTML5 backend used on desktop.
 */
const dragAndDropThoughtTouch = async (sourceValue: string, destValue: string, { position }: Options) => {
  const source = await waitForEditable(sourceValue)
  const dest = await waitForEditable(destValue)

  const sourceBoundingBox = await source.asElement()?.boundingBox()
  if (!sourceBoundingBox) throw new Error(`Bounding box not found for thought "${sourceValue}"`)

  const destBoundingBox = await dest.asElement()?.boundingBox()
  if (!destBoundingBox) throw new Error(`Bounding box not found for thought "${destValue}"`)

  // The bullet is highlighted when the long press activates, which is the point at which react-dnd TouchBackend has
  // begun the drag.
  const bullet = await page.evaluateHandle(editable => {
    if (!editable) throw new Error('Editable not found')
    const thoughtContainer = editable.closest('[aria-label="thought-container"]')
    if (!thoughtContainer) throw new Error('Thought container not found')
    const bulletElement = thoughtContainer.querySelector('[aria-label="bullet"]')
    if (!bulletElement) throw new Error('Bullet not found')
    return bulletElement
  }, source)
  if (!(bullet instanceof ElementHandle)) throw new Error(`Bullet element not found for thought "${sourceValue}"`)

  const startX = sourceBoundingBox.x + 1
  const startY = sourceBoundingBox.y + sourceBoundingBox.height / 2

  // These are the coordinates dragAndDropThought uses, which land on the destination thought's own drop target rather
  // than a neighbour's.
  const endX = destBoundingBox.x + destBoundingBox.width / 1.25
  const endY = destBoundingBox.y + (position === 'before' ? 0 : 20)

  await page.touchscreen.touchStart(startX, startY)
  await page.waitForFunction(
    (bulletElement: Element) => bulletElement.getAttribute('data-highlighted') === 'true',
    { timeout: 5000 },
    bullet,
  )

  const steps = 20
  for (let i = 1; i <= steps; i++) {
    await page.touchscreen.touchMove(startX + ((endX - startX) * i) / steps, startY + ((endY - startY) * i) / steps)
  }

  await waitForAlert('Drag and drop')
  await page.touchscreen.touchEnd()
}

export default dragAndDropThoughtTouch
