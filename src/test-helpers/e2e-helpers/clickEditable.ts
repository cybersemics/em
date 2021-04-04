import { Page } from 'puppeteer'

interface Options {
  hashedContext: string,
  // Where in the horizontal line of editable should the mouse be clicked
  horizontalClickLine?: 'left' | 'right',
  // Specifcy specific node on editable to click on. Overrides horizontalClickLine
  offset?: number,
}

/**
 * Click the editable for the given thought.
 */
const clickEditable = async (page: Page, { hashedContext, horizontalClickLine = 'left', offset }: Options) => {
  const query = `.editable-${hashedContext}`

  const editableNode = await page.$(query)

  if (!editableNode) throw new Error('Editable node not found.')

  const boundingBox = await editableNode.asElement()?.boundingBox()

  if (!boundingBox) throw new Error('Bouding box of editable not found.')

  /** Get cordinates for specific text node in the editable. */
  const offsetCooridinates = () => page.evaluate((editableNode: HTMLElement, offset: number) => {
    const textNode = editableNode.firstChild
    if (!textNode) return
    const range = document.createRange()
    range.setStart(textNode, offset)
    const { right, top, height } = range.getBoundingClientRect()
    return {
      x: right,
      y: top + (height / 2)
    }
  }, editableNode, offset || 0)

  const coordinate = !offset ? {
    x: boundingBox.x + (horizontalClickLine === 'left' ? 0 : horizontalClickLine === 'right' ? boundingBox.width : boundingBox.width / 2),
    y: boundingBox.y + (boundingBox.height / 2)
  } : await offsetCooridinates()

  if (!coordinate) throw new Error('Coordinate not found.')

  await page.mouse.click(coordinate.x, coordinate.y)
}

export default clickEditable
