import { JSHandle, Page } from 'puppeteer'

interface Options {
  // Where in the horizontal line (inside) of the target node should the mouse be clicked
  horizontalClickLine?: 'left' | 'right',
  // Specify specific node on editable to click on. Overrides horizontalClickLine
  offset?: number,
  // Number of pixels of x offset to add to the click coordinates
  x?: number,
  // Number of pixels of y offset to add to the click coordinates
  y?: number,
}

/**
 * Click the given node with offset.
 */
const clickEditable = async (page: Page, nodeHandle: JSHandle, { horizontalClickLine = 'left', offset, x = 0, y = 0 }: Options = {}) => {

  const boundingBox = await nodeHandle.asElement()?.boundingBox()

  if (!boundingBox) throw new Error('Bouding box of editable not found.')

  /** Get cordinates for specific text node if the given node has text child. */
  const offsetCoordinates = () => page.evaluate((node: HTMLElement, offset: number) => {
    const textNode = node.firstChild
    if (!textNode || textNode.nodeName !== '#text') return
    const range = document.createRange()
    range.setStart(textNode, offset)
    const { right, top, height } = range.getBoundingClientRect()
    return {
      x: right,
      y: top + (height / 2)
    }
  }, nodeHandle, offset || 0)

  const coordinate = !offset ? {
    x: boundingBox.x + (
      horizontalClickLine === 'left' ? 0
      : horizontalClickLine === 'right' ? boundingBox.width - 1
      : boundingBox.width / 2
    ),
    y: boundingBox.y + (boundingBox.height / 2)
  } : await offsetCoordinates()

  if (!coordinate) throw new Error('Coordinate not found.')

  await page.mouse.click(coordinate.x + x, coordinate.y + y)
}

export default clickEditable
