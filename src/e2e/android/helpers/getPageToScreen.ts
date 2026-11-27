import touchPath from './touchPath'

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
 * The scale is the width of Chrome's compositor view over the viewport's. The offset is calibrated with a real touch:
 * a tap at the centre of the compositor view, whose position in the page is read from its touchstart. Chrome's toolbar
 * and infobars overlay the page by amounts that vary with the device and the session, so the page's edges cannot be
 * read off the view. The tap lands on whatever is at the centre of the page, so measure before anything a tap there
 * would disturb, and while the keyboard is hidden.
 */
const getPageToScreen = async (): Promise<(point: Point) => Point> => {
  const viewportWidth = await browser.execute(() => {
    const w = window as Window & { pageToScreenTouch?: { x: number; y: number } | null }
    w.pageToScreenTouch = null
    window.addEventListener(
      'touchstart',
      e => {
        w.pageToScreenTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      },
      { capture: true, once: true, passive: true },
    )
    return window.innerWidth
  })

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

  const scale = view.width / viewportWidth
  const centre = { x: Math.round(view.x + view.width / 2), y: Math.round(view.y + view.height / 2) }
  await touchPath([centre])

  let touch: Point | null = null
  await browser.waitUntil(
    async () => {
      touch = await browser.execute(
        () => (window as Window & { pageToScreenTouch?: Point | null }).pageToScreenTouch ?? null,
      )
      return !!touch
    },
    {
      timeout: 5000,
      timeoutMsg: `getPageToScreen: a tap at screen ${JSON.stringify(centre)}, the centre of Chrome's compositor view ${JSON.stringify(view)}, never reached the page`,
    },
  )

  const origin = { x: centre.x - touch!.x * scale, y: centre.y - touch!.y * scale }
  return ({ x, y }) => ({ x: Math.round(origin.x + x * scale), y: Math.round(origin.y + y * scale) })
}

export default getPageToScreen
