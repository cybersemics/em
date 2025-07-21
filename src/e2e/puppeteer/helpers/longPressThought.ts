import { ElementHandle } from 'puppeteer'
import { JSHandle } from 'puppeteer'
import { page } from '../setup'

interface Options {
  /** Click on the inside edge of the editable. Default: left. */
  edge?: 'left' | 'right'
  /** Number of pixels of x offset to add to the click coordinates of width/2. */
  x?: number
  /** Number of pixels of y offset to add to the click coordinates of height/2. */
  y?: number
}

/**
 * Tap and hold a thought until a long press occurs. Times out after 1 second.
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
    x: boundingBox.x + (edge === 'left' ? 1 : boundingBox.width - 1) + x,
    y: boundingBox.y + boundingBox.height / 2 + y,
  }

  await page.touchscreen.touchStart(coordinate.x, coordinate.y)
  await thoughtContainer.waitForSelector('[aria-label=bullet][data-highlighted=true')
  await page.touchscreen.touchEnd()
}

export default longPressThought
