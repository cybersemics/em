import { Browser, Element } from 'webdriverio'
import getNativeElementRect from './getNativeElementRect'

interface Options {
  // Where in the horizontal line (inside) of the target node should be tapped
  horizontalTapLine?: 'left' | 'right'
  // Specify specific node on editable to tap. Overrides horizontalClickLine
  offset?: number
  // Number of pixels of x offset to add to the tap coordinates
  x?: number
  // Number of pixels of y offset to add to the tap coordinates
  y?: number
}

/**
 * Tap a node with an optional text offset or x,y offset.
 */
const tap = async (
  browser: Browser<'async'>,
  nodeHandle: Element<'async'>,
  { horizontalTapLine = 'left', offset, x = 0, y = 0 }: Options = {},
) => {
  const boundingBox = await browser.getElementRect(nodeHandle.elementId)
  if (!boundingBox) throw new Error('Bouding box of editable not found.')

  /** Get cordinates for specific text node if the given node has text child. */
  const offsetCoordinates = () =>
    browser.execute(
      function (ele, offset) {
        // Element<'async'> does not contain native properties like nodeName, textContent, etc
        // Not sure what the actual WebDriverIO type that is returned by findElement
        // Node does not contain property elementId; it is only a Node inside browser.execute, so we cannot change the typeo of the nodeHandle argument
        const textNode = (ele as unknown as Node).firstChild
        if (!textNode || textNode.nodeName !== '#text') return
        const range = document.createRange()
        range.setStart(textNode, offset ?? 0)
        const { right, top, height } = range.getBoundingClientRect()
        return {
          x: right,
          y: top + height / 2,
        }
      },
      nodeHandle,
      offset,
    )

  const coordinate = !offset
    ? {
        x:
          boundingBox.x +
          (horizontalTapLine === 'left'
            ? 0
            : horizontalTapLine === 'right'
              ? boundingBox.width - 1
              : boundingBox.width / 2),
        y: boundingBox.y + boundingBox.height / 2,
      }
    : await offsetCoordinates()

  if (!coordinate) throw new Error('Coordinate not found.')

  const topBarRect = await getNativeElementRect(browser, '//XCUIElementTypeOther[@name="topBrowserBar"]')

  await browser.touchAction({
    action: 'tap',
    x: coordinate.x + x,
    y: coordinate.y + y + (topBarRect.y + topBarRect.height + 3),
  })
}

export default tap
