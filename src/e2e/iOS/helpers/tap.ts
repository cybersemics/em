import type { Element } from 'webdriverio'
import getElementRectByScreen from './getElementRectByScreen.js'

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
 * context even while the WEBVIEW context is active, so it takes device screen coordinates rather than page
 * coordinates. The node is therefore measured with `getElementRectByScreen`, which adds the web content's
 * native origin. Do not compensate for the difference with a hand-tuned `y` at the call site.
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

  const boundingBox = await getElementRectByScreen(nodeHandle)
  if (!boundingBox) throw new Error('Bounding box of editable not found.')

  /**
   * Get the position of a specific text node as a delta from the element's own top-left corner, if the given
   * node has a text child. Measuring the two rects against each other rather than reporting the range's own
   * position keeps this path out of the page-versus-screen coordinate question entirely, since the delta is
   * the same in both frames.
   */
  const offsetDelta = () =>
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
        const elementRect = (ele as unknown as HTMLElement).getBoundingClientRect()
        return {
          x: right - elementRect.left,
          y: top + height / 2 - elementRect.top,
        }
      },
      nodeHandle,
      offset,
    )

  const delta = !offset
    ? {
        x:
          horizontalTapLine === 'left'
            ? 1
            : horizontalTapLine === 'right'
              ? boundingBox.width - 1
              : boundingBox.width / 2,
        y: boundingBox.height / 2,
      }
    : await offsetDelta()

  if (!delta) throw new Error('Coordinate not found.')

  const coordinate = { x: boundingBox.x + delta.x, y: boundingBox.y + delta.y }

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
