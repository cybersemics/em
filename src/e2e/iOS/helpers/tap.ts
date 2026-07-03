import waitForElement from './waitForElement'

interface Options {
  // Where on the horizontal axis of the target node's bounding box to tap.
  // Defaults to 'center' when a selector string is given (tapping a named control such as a toolbar
  // icon or color swatch, whose center is the reliable hit target) and 'left' when an Element handle
  // is given (caret positioning tests anchor to the left edge, optionally with offset/x).
  horizontalTapLine?: 'left' | 'center' | 'right'
  // Specify the offset on a text child of the target node. Overrides horizontalTapLine.
  offset?: number
  // Pixels of x offset to add to the tap coordinates (after horizontalTapLine/offset).
  x?: number
  // Pixels of y offset to add to the tap coordinates (after horizontalTapLine/offset).
  y?: number
  // Milliseconds to delay the release of the tap.
  releaseDelayMs?: number
}

/**
 * Tap a node with an optional text offset or x,y offset.
 *
 * Accepts either an Element handle or a CSS selector string. When a selector is
 * given, waits for the element to exist and scrolls it into view if needed before
 * tapping, and taps its horizontal center by default (named controls like toolbar
 * icons and color swatches are small targets whose edges are easy to miss). Element
 * handles default to the left edge for caret positioning.
 *
 * Coordinates are first calculated in WebView/viewport space (via
 * `getElementRect` / DOM `Range`) and then translated to device screen
 * coordinates by adding the WebView container's screen origin. The tap is
 * finally dispatched in NATIVE_APP context with `pointerType: 'touch'`, so it
 * goes through iOS's real touch input pipeline.
 */
const tap = async (
  nodeHandleOrSelector: WebdriverIO.Element | string,
  {
    horizontalTapLine = typeof nodeHandleOrSelector === 'string' ? 'center' : 'left',
    offset,
    x = 0,
    y = 0,
    releaseDelayMs = 100,
  }: Options = {},
) => {
  let nodeHandle: WebdriverIO.Element
  if (typeof nodeHandleOrSelector === 'string') {
    nodeHandle = await waitForElement(nodeHandleOrSelector, { timeout: 10000 })
    const isClickable = await nodeHandle.isClickable()
    if (!isClickable) {
      await nodeHandle.scrollIntoView({ block: 'center' })
      await nodeHandle.waitForClickable({ timeout: 10000 })
    }
  } else {
    nodeHandle = nodeHandleOrSelector
  }
  // Get scroll position before tap
  const scrollBefore = await browser.execute(() => ({
    x: window.scrollX,
    y: window.scrollY,
  }))

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

  // Compute the tap target in WebView viewport coordinates (scroll-exclusive)
  // via getBoundingClientRect / DOM Range — NOT browser.getElementRect, which
  // returns page coordinates that include window.scrollY and break once the
  // page is scrolled after gesture actions.
  const viewportCoordinate = (await browser.execute(
    function (ele, horizontalTapLine, offset) {
      const el = ele as unknown as HTMLElement

      if (offset !== undefined && offset !== null) {
        const textNode = (el as unknown as Node).firstChild
        if (!textNode || textNode.nodeName !== '#text') return null
        const range = document.createRange()
        range.setStart(textNode, offset)
        const { right, top, height } = range.getBoundingClientRect()
        return { x: right, y: top + height / 2 }
      }

      const r = el.getBoundingClientRect()
      const cx =
        horizontalTapLine === 'left' ? r.left : horizontalTapLine === 'right' ? r.right - 1 : r.left + r.width / 2
      return { x: cx, y: r.top + r.height / 2 }
    },
    nodeHandle,
    horizontalTapLine,
    offset,
  )) as { x: number; y: number } | null

  if (!viewportCoordinate) throw new Error('Coordinate not found.')

  // Translate WebView viewport coordinates to device screen coordinates and
  // dispatch the tap through XCUITest's native input pipeline.
  const oldContext = ((await browser.getContext()) as string) || 'NATIVE_APP'
  try {
    await browser.switchContext('NATIVE_APP')

    const webContainer = await browser.$('//XCUIElementTypeOther[@name="em"]').getElement()
    const { x: webOriginX, y: webOriginY } = await browser.getElementRect(webContainer.elementId)

    const finalCoords = {
      x: Math.round(viewportCoordinate.x + x + webOriginX),
      y: Math.round(viewportCoordinate.y + y + webOriginY),
    }

    console.info(
      `Tap: viewport=(${viewportCoordinate.x}, ${viewportCoordinate.y}) ` +
        `offset=(${x}, ${y}) webOrigin=(${webOriginX}, ${webOriginY}) ` +
        `screen=(${finalCoords.x}, ${finalCoords.y})`,
    )

    // Use performActions directly to avoid the automatic releaseActions call
    // that WebDriverIO's `action().perform()` issues, which Safari/XCUITest
    // does not support (no DELETE /actions endpoint).
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          {
            type: 'pointerMove',
            duration: 0,
            x: finalCoords.x,
            y: finalCoords.y,
            origin: 'viewport',
          },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: releaseDelayMs },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
  } finally {
    await browser.switchContext(oldContext)
    await browser.execute(({ x, y }) => window.scrollTo(x, y), scrollBefore)
    await browser.waitUntil(
      async () => {
        const current = await browser.execute(() => ({ x: window.scrollX, y: window.scrollY }))
        return current.x === scrollBefore.x && current.y === scrollBefore.y
      },
      { timeout: 3000, timeoutMsg: 'Failed to restore scroll position after tap' },
    )
  }
}

export default tap
