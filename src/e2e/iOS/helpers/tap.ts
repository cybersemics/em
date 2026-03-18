import type { Element } from 'webdriverio'

// import getNativeElementRect from './getNativeElementRect'

interface Options {
  // Where in the horizontal line (inside) of the target node should be tapped
  horizontalTapLine?: 'left' | 'right'
  // Specify specific node on editable to tap. Overrides horizontalClickLine
  offset?: number
  // Number of pixels of x offset to add to the tap coordinates
  x?: number
  // Number of pixels of y offset to add to the tap coordinates
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
  { horizontalTapLine = 'left', offset, x = 0, y = 0, releaseDelayMs = 100 }: Options = {},
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

  // const topBarRect = await getNativeElementRect(browser, '//XCUIElementTypeOther[@name="topBrowserBar"]')
  // console.log('topbarrect', topBarRect)

  console.info(
    `Coordinates: x ${coordinate.x} y ${coordinate.y} x-offset ${x} y-offset ${y} bb-x ${boundingBox.x} bby ${boundingBox.y}`,
  )

  const finalCoords = {
    x: coordinate.x + x,
    y: coordinate.y + y,
  }

  console.info(`Tapping at coordinates {x: ${finalCoords.x}, y: ${finalCoords.y}}`)

  // Use performActions directly to avoid the automatic releaseActions call
  // Safari/XCUITest doesn't support the DELETE /actions endpoint (releaseActions)
  // which WebDriverIO's action().perform() calls automatically after performing
  // Note: pointerType defaults to 'mouse' in WebDriverIO's action API
  await browser.performActions([
    {
      type: 'pointer',
      id: 'pointer1',
      parameters: { pointerType: 'mouse' },
      actions: [
        {
          type: 'pointerMove',
          duration: 0,
          x: Math.round(finalCoords.x),
          y: Math.round(finalCoords.y),
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
