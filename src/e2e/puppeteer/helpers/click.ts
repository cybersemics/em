import { JSHandle } from 'puppeteer'
import { page } from '../session'
import waitForSelector from './waitForSelector'

interface Options {
  /** Hold a mobile touch at the element's center. Release it with page.touchscreen.touchEnd. */
  hold?: boolean
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
  { edge = 'left', offset, x = 0, y = 0, hold = false }: Options = {},
) => {
  const isMobile = page.viewport()?.isMobile

  if (hold && !isMobile) throw new Error('Holding a touch requires mobile emulation.')

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
  if (typeof nodeHandleOrSelector === 'string' && !offset && !x && !y && !hold) {
    return page[isMobile ? 'tap' : 'click'](nodeHandleOrSelector)
  }

  const boundingBox = await nodeHandle?.boundingBox()

  if (!boundingBox) throw new Error('Bounding box of element not found.')

  if (hold) {
    await page.touchscreen.touchStart(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2)
    return
  }

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

  /** Returns the x just inside the editable's left edge, stepping past the thought's bullet, which is absolutely
   * positioned and overlaps the editable by 18 - fontSize px at font sizes below 18. */
  const leftEdgeX = async (): Promise<number> => {
    const result = await page.evaluate(
      (node: HTMLElement, y: number) => {
        const bullet = node.closest('[aria-label="thought-container"]')?.querySelector('[aria-label="bullet"]')
        const x = Math.max(node.getBoundingClientRect().left, bullet?.getBoundingClientRect().right ?? -Infinity) + 1
        const hit = document.elementFromPoint(x, y)
        return { x, hit: node.contains(hit) ? null : (hit?.getAttribute('aria-label') ?? hit?.tagName ?? 'nothing') }
      },
      nodeHandle as unknown as HTMLElement,
      boundingBox.y + boundingBox.height / 2,
    )
    if (result.hit) {
      throw new Error(
        `The left edge of the element is covered by ${result.hit} at x ${result.x}, so the click would miss it.`,
      )
    }
    return result.x
  }

  const coordinate = !offset
    ? {
        x: edge === 'left' ? await leftEdgeX() : boundingBox.x + boundingBox.width - 1,
        y: boundingBox.y + boundingBox.height / 2,
      }
    : await offsetCoordinates()

  if (!coordinate) throw new Error('Coordinate not found.')

  await page.mouse.click(coordinate.x + x, coordinate.y + y)
}

export default click
