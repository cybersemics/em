import { JSHandle, Page } from 'puppeteer'

interface Options {
  // Click on the inside edge of the editable
  edge?: 'left' | 'right'
  // Specify specific node on editable to click on. Overrides edge.
  offset?: number
  // Number of pixels of x offset to add to the click coordinates
  x?: number
  // Number of pixels of y offset to add to the click coordinates
  y?: number
}

/**
 * Click a node with an optional text offset or x,y offset.
 */
const click = async (
  page: Page,
  nodeHandleOrSelector: JSHandle | string,
  { edge = 'left', offset, x = 0, y = 0 }: Options = {},
) => {
  const isMobile = page.viewport()?.isMobile

  if (isMobile && (offset || x || y)) {
    throw new Error(
      'page.tap does not accept x,y coordinates, so the offset, x, and y options are not supported in mobile emulation mode.',
    )
  }

  // if nodeHandleOrSelector is a selector and there is no text offset or x,y offset, simply call page.click or page.tap
  if (typeof nodeHandleOrSelector === 'string' && !offset && !x && !y) {
    return page[isMobile ? 'tap' : 'click'](nodeHandleOrSelector)
  }

  // otherwise if nodeHandleOrSelector is a selector, fetch the node handle
  const nodeHandle =
    typeof nodeHandleOrSelector === 'string'
      ? (await page.$(nodeHandleOrSelector as string))!
      : (nodeHandleOrSelector as JSHandle).asElement()!
  const boundingBox = await nodeHandle.boundingBox()

  if (!boundingBox) throw new Error('Bouding box of editable not found.')

  /** Get cordinates for specific text node if the given node has text child. */
  const offsetCoordinates = () =>
    page.evaluate(
      (node: HTMLElement, offset: number) => {
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
      nodeHandle,
      offset || 0,
    )

  const coordinate = !offset
    ? {
        x: boundingBox.x + (edge === 'left' ? 1 : edge === 'right' ? boundingBox.width - 1 : boundingBox.width / 2),
        y: boundingBox.y + boundingBox.height / 2,
      }
    : await offsetCoordinates()

  if (!coordinate) throw new Error('Coordinate not found.')

  await page.mouse.click(coordinate.x + x, coordinate.y + y)
}

export default click
