/** A point in CSS pixels relative to the page's viewport, or in device pixels on the screen. */
interface Point {
  x: number
  y: number
}

/**
 * Measures where Chrome draws the page on the screen and returns a function that converts a point in the page's
 * viewport (CSS pixels, as getBoundingClientRect reports them) into the screen pixels that native touches are delivered
 * in (touchPath).
 *
 * Chrome draws the page in its compositor view, and its toolbar overlays the top of that view, so the page's top edge
 * cannot be read off the view. Its bottom edge can: it is the view's bottom edge. Measure while the keyboard is hidden,
 * since the keyboard overlays the bottom of both (interactive-widget=overlays-content).
 */
const getPageToScreen = async (): Promise<(point: Point) => Point> => {
  const viewport = await browser.execute(() => ({ width: window.innerWidth, height: window.innerHeight }))

  const webContext = (await browser.getContext()) as string
  await browser.switchContext('NATIVE_APP')
  let view: { x: number; y: number; width: number; height: number }
  try {
    // The protocol command rather than browser.$, which WebdriverIO translates into a WebDriver BiDi query of the page
    // when the session supports BiDi, and a page query cannot find a native view.
    const element = await browser.findElement(
      'xpath',
      '//*[@resource-id="com.android.chrome:id/compositor_view_holder"]',
    )
    view = await browser.getElementRect(element['element-6066-11e4-a52e-4f735466cecf'])
  } finally {
    await browser.switchContext(webContext)
  }

  const scale = view.width / viewport.width
  const top = view.y + view.height - viewport.height * scale
  return ({ x, y }) => ({ x: Math.round(view.x + x * scale), y: Math.round(top + y * scale) })
}

export default getPageToScreen
