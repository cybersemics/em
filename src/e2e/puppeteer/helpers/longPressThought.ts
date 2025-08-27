import { ElementHandle } from 'puppeteer'
import { JSHandle } from 'puppeteer'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../../../constants'
import sleep from '../../../util/sleep'
import { page } from '../setup'

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

  const thoughtContainer = await page.evaluateHandle(editableNode => {
    if (!editableNode) throw new Error('Node handle does not contain a valid Element')
    return editableNode.closest('[aria-label="thought-container"]')
  }, nodeHandle)

  if (!(thoughtContainer instanceof ElementHandle)) throw new Error('Thought container not found')

  const coordinate = {
    x: boundingBox.x + (edge ? (edge === 'left' ? 1 : boundingBox.width - 1) : boundingBox.width / 2) + x,
    y: boundingBox.y + boundingBox.height / 2 + y,
  }

  await page.touchscreen.touchStart(coordinate.x, coordinate.y)

  // Wait for the long press duration to elapse before checking for highlight
  await sleep(TIMEOUT_LONG_PRESS_THOUGHT)

  await thoughtContainer.waitForSelector('[aria-label="bullet"][data-highlighted="true"]', { timeout: 2000 })

  await page.touchscreen.touchEnd()
}

export default longPressThought
