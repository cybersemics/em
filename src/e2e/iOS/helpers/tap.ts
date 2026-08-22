import type { Element } from 'webdriverio'
import getScreenOffsetY from './getScreenOffsetY.js'

interface Options {
  // Where in the horizontal line (inside) of the target node should be tapped. Defaults to center, which
  // matches how a person taps: told to tap a button, they aim for the middle, not the exact edge. Adjacent
  // toolbar buttons are inline-block with no margin, so their padding boxes touch and an edge tap is half a
  // pixel of rounding away from landing on the neighboring command.
  horizontalTapLine?: 'left' | 'center' | 'right'
  // Pointer type to use for the tap action. Defaults to 'mouse'.
  pointerType?: 'mouse' | 'touch'
  // Specify specific node on editable to tap. Overrides horizontalTapLine
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
 *
 * The tap is dispatched with `performActions`, which Appium's XCUITest driver always runs in the native
 * context even while the WEBVIEW context is active, so it takes device screen coordinates. The node is
 * measured in viewport coordinates and converted with `getScreenOffsetY`. Do not compensate for the
 * difference with a hand-tuned `y` at the call site.
 *
 * Uses the global browser object from WDIO.
 */
const tap = async (
  nodeHandle: Element,
  { horizontalTapLine = 'center', offset, x = 0, y = 0, pointerType = 'mouse', releaseDelayMs = 100 }: Options = {},
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

  // Viewport coordinates, not the page coordinates browser.getElementRect returns: the toolbar is
  // position: fixed, and the W3C algorithm adds the scroll offset to a bounding rect that is pinned at 0, so
  // its page y is just the scroll position. The text offset is measured against the element's own box in the
  // same call, since a delta is the same in either frame.
  const raw = await browser.execute(
    function (ele, offset, horizontalTapLine) {
      const element = ele as unknown as HTMLElement
      const box = element.getBoundingClientRect()
      if (offset === undefined || offset === null) {
        return JSON.stringify({
          x:
            box.left +
            (horizontalTapLine === 'left' ? 1 : horizontalTapLine === 'right' ? box.width - 1 : box.width / 2),
          y: box.top + box.height / 2,
        })
      }
      const textNode = (element as unknown as Node).firstChild
      if (!textNode || textNode.nodeName !== '#text') return ''
      const range = document.createRange()
      range.setStart(textNode, offset)
      const { right, top, height } = range.getBoundingClientRect()
      return JSON.stringify({ x: right, y: top + height / 2 })
    },
    nodeHandle,
    offset,
    horizontalTapLine,
  )
  if (!raw) throw new Error('Coordinate not found.')

  const viewportCoordinate = JSON.parse(raw) as { x: number; y: number }
  const offsetY = await getScreenOffsetY()
  const coordinate = { x: viewportCoordinate.x, y: viewportCoordinate.y + offsetY }

  console.info(
    `Coordinates: x ${coordinate.x} y ${coordinate.y} x-offset ${x} y-offset ${y} viewport-y ${viewportCoordinate.y} screen-offset-y ${offsetY}`,
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
      parameters: { pointerType },
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
