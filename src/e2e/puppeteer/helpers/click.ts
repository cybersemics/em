import { JSHandle } from 'puppeteer'
import { page } from '../setup'
import waitForSelector from './waitForSelector'

interface Options {
  /** Click on the inside edge of the editable. Default: left. */
  edge?: 'left' | 'right'
  /** Specify specific node on editable to click on. Overrides edge. */
  offset?: number
  /** Number of pixels of x offset to add to the click coordinates of width/2. */
  x?: number
  /** Number of pixels of y offset to add to the click coordinates of height/2. */
  y?: number
}

/**
 * Click a node with an optional text offset or x,y offset. Times out after 1 second.
 */
const click = async (
  nodeHandleOrSelector: JSHandle | string,
  { edge = 'left', offset, x = 0, y = 0 }: Options = {},
) => {
  const isMobile = page.viewport()?.isMobile

  if (isMobile && (offset || x || y)) {
    throw new Error(
      'page.tap does not accept x,y coordinates, so the offset, x, and y options are not supported in mobile emulation mode.',
    )
  }

  // otherwise if nodeHandleOrSelector is a selector, fetch the node handle
  const nodeHandle =
    typeof nodeHandleOrSelector === 'string'
      ? await waitForSelector(nodeHandleOrSelector)
      : nodeHandleOrSelector.asElement()

  // if nodeHandleOrSelector is a selector and there is no text offset or x,y offset, simply call page.click or page.tap without having to fetch the bounding box and click on specific coordinates
  if (typeof nodeHandleOrSelector === 'string' && !offset && !x && !y) {
    return page[isMobile ? 'tap' : 'click'](nodeHandleOrSelector)
  }

  const boundingBox = await nodeHandle?.boundingBox()

  if (!boundingBox) throw new Error('Bounding box of element not found.')

  /** Get cordinates for specific text node if the given node has text child. */
  const offsetCoordinates = (): Promise<{ x: number; y: number } | undefined> =>
    page.evaluate(
      (node: HTMLElement, offset: number): { x: number; y: number } | undefined => {
        const textNode = node.firstChild
        if (!textNode || textNode.nodeName !== '#text') return
        const range = document.createRange()
        range.setStart(textNode, offset)
        const { right, top, height } = range.getBoundingClientRect()
        return {
          x: right,
          y: top + height / 2,
        }
      },
      nodeHandle as unknown as HTMLElement,
      offset || 0,
    )

  const coordinate = !offset
    ? {
        x: boundingBox.x + (edge === 'left' ? 1 : boundingBox.width - 1),
        y: boundingBox.y + boundingBox.height / 2,
      }
    : await offsetCoordinates()

  if (!coordinate) throw new Error('Coordinate not found.')

  await page.mouse.click(coordinate.x + x, coordinate.y + y)
}

export default click
