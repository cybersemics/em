import { ElementHandle } from 'puppeteer'
import { JSHandle } from 'puppeteer'
import { page } from '../setup'
import waitForFrames from './waitForFrames'

interface Options {
  /** Click on the inside edge of the editable. Default: left. */
  edge?: 'left' | 'right'
  /** Number of pixels of x offset to add to the touch coordinates, which defaults to width/2 but can be set to the left or right edge. */
  x?: number
  /** Number of pixels of y offset to add to the touch coordinates of height/2. */
  y?: number
}

/**
 * Tap and hold a thought until a long press occurs.
 */
const longPressThought = async (
  nodeHandle: ElementHandle<Element> | JSHandle<undefined>,
  { edge = 'left', x = 0, y = 0 }: Options = {},
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

  await page.waitForFunction(
    (bulletEl: Element) => bulletEl.getAttribute('data-highlighted') === 'true',
    { timeout: 6000 },
    bulletElement,
  )

  await page.touchscreen.touchEnd()

  // After touchEnd, toggleMulticursor is dispatched. The bullet may briefly become
  // unhighlighted (when isDragging becomes false) before the multicursor state updates.
  // Wait for animation frames to allow Redux state updates and React re-renders to complete.
  await waitForFrames(2)

  // Wait for the bullet to be highlighted, confirming the multicursor state has been
  // updated and the thought is now in the multicursor selection. This is critical for
  // multiselect scenarios to ensure the first selection is committed before starting
  // the second long press.
  //
  // The bullet might transition: highlighted (long press) -> unhighlighted -> highlighted (multicursor)
  // Or it might stay highlighted if the multicursor state updates quickly.
  // We use frequent polling (100ms) and a longer timeout (6000ms) to handle slower CI environments.
  await page.waitForFunction(
    (bulletEl: Element) => bulletEl.getAttribute('data-highlighted') === 'true',
    { timeout: 6000, polling: 100 },
    bulletElement,
  )

  // Wait for one more frame to ensure the highlight is stable and not a brief flash
  await waitForFrames(1)

  // Final verification: ensure the bullet is still highlighted after the frame delay
  // This confirms the multicursor state is active, not just a transient highlight
  const isStillHighlighted = await page.evaluate(
    (bulletEl: Element) => bulletEl.getAttribute('data-highlighted') === 'true',
    bulletElement,
  )

  if (!isStillHighlighted) {
    // If not highlighted, wait for it to become highlighted (multicursor state update)
    await page.waitForFunction(
      (bulletEl: Element) => bulletEl.getAttribute('data-highlighted') === 'true',
      { timeout: 2000, polling: 100 },
      bulletElement,
    )
  }
}

export default longPressThought
