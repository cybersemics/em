import type { Element } from 'webdriverio'

// import getNativeElementRect from './getNativeElementRect'

interface Options {
  // Which point of the target node to tap when no x is given. Defaults to center, which matches how a
  // person taps: told to tap a button, they aim for the middle, not the exact edge. Adjacent toolbar
  // buttons are inline-block with no margin, so their padding boxes touch and an edge tap is half a pixel
  // of rounding away from landing on the neighboring command.
  horizontalTapLine?: 'left' | 'center' | 'right'
  // Pointer type to use for the tap action. Defaults to 'mouse'.
  pointerType?: 'mouse' | 'touch'
  // Specify specific node on editable to tap. Overrides horizontalTapLine and x
  offset?: number
  // Pixels from the LEFT EDGE of the target node. Overrides horizontalTapLine. Never measured from the
  // center: the center moves with the node's width, so a pixel count from it means nothing on its own.
  x?: number
  // Pixels from the TOP EDGE of the target node. Defaults to the vertical center. Like x, measured from
  // the edge so that the number means the same thing regardless of the node's size.
  y?: number
  // Milliseconds to delay the release of the tap.
  releaseDelayMs?: number
}

/**
 * Tap a node with an optional text offset or x,y offset.
 * Uses the global browser object from WDIO.
 */
const tap = async (
  nodeHandle: Element,
  { horizontalTapLine = 'center', offset, x, y, pointerType = 'mouse', releaseDelayMs = 100 }: Options = {},
) => {
  // Ensure element exists and has an elementId
  const exists = await nodeHandle.isExisting()
  if (!exists) {
    throw new Error('Element does not exist in the DOM.')
  }

  // Get elementId - it's a property, not a promise
  const elementId = nodeHandle.elementId
  if (!elementId) {
    throw new Error(
      'Element does not have an elementId. Make sure the element was obtained from a browser query (e.g., browser.$() or getEditable()).',
    )
  }

  const boundingBox = await browser.getElementRect(elementId)
  if (!boundingBox) throw new Error('Bounding box of editable not found.')

  /** Get cordinates for specific text node if the given node has text child. */
  const offsetCoordinates = () =>
    browser.execute(
      function (ele, offset) {
        // Element does not contain native properties like nodeName, textContent, etc
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

  // x and y are measured from the node's top left corner, so each is meaningful on its own. Whichever is
  // omitted falls back to that axis's default point: horizontalTapLine for x, the vertical center for y.
  const horizontalTapLineOffset =
    horizontalTapLine === 'left' ? 1 : horizontalTapLine === 'right' ? boundingBox.width - 1 : boundingBox.width / 2

  const rangeCoordinate = offset !== undefined ? await offsetCoordinates() : undefined
  if (offset !== undefined && !rangeCoordinate) throw new Error('Coordinate not found.')

  const coordinate = {
    x: rangeCoordinate ? rangeCoordinate.x : boundingBox.x + (x ?? horizontalTapLineOffset),
    y: y !== undefined ? boundingBox.y + y : (rangeCoordinate?.y ?? boundingBox.y + boundingBox.height / 2),
  }

  // const topBarRect = await getNativeElementRect(browser, '//XCUIElementTypeOther[@name="topBrowserBar"]')
  // console.log('topbarrect', topBarRect)

  console.info(
    `Tapping at {x: ${coordinate.x}, y: ${coordinate.y}} (bounding box x ${boundingBox.x} y ${boundingBox.y} w ${boundingBox.width} h ${boundingBox.height}, x-offset ${x} y-offset ${y})`,
  )

  // Use performActions directly to avoid the automatic releaseActions call
  // Safari/XCUITest doesn't support the DELETE /actions endpoint (releaseActions)
  // which WebDriverIO's action().perform() calls automatically after performing
  // Note: pointerType defaults to 'mouse' in WebDriverIO's action API
  await browser.performActions([
    {
      type: 'pointer',
      id: 'pointer1',
      parameters: { pointerType },
      actions: [
        {
          type: 'pointerMove',
          duration: 0,
          x: Math.round(coordinate.x),
          y: Math.round(coordinate.y),
          origin: 'viewport',
        },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: releaseDelayMs },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
}

export default tap
