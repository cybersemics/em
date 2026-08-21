import getNativeElementRect from './getNativeElementRect.js'

/** The web-context metrics that the web content's screen origin can move with, read in a single round trip. */
interface ViewportMetrics {
  innerWidth: number
  innerHeight: number
  screenWidth: number
  screenHeight: number
  scale: number
  scrollX: number
  scrollY: number
}

// Measuring the origin costs two context switches and an XCUITest XPath query over the whole accessibility
// tree — around 1.1s, and tap needs the origin on every tap. So it is cached, keyed on every web-context
// quantity it is known to move with.
//
// Two of those deserve comment. Scroll is in the key because the origin demonstrably moves with it: across one
// run it was seen at 58, 32, 26, and -31, and it changed by 89 between two consecutive taps in a single test.
// Whether that is because this element is the scrolled content or because scrolling collapses Safari's top bar
// is still unsettled (see the diagnostics below), and keying on scroll means it does not have to be settled —
// the cache is correct either way.
//
// visualViewport.height is deliberately *not* in the key, which is what made an earlier version of this cache
// miss 55 times out of 60 taps. It changes every time the keyboard opens or closes, which this suite does
// constantly, and none of that moves the content origin. innerHeight is the one that tracks the chrome
// collapse, and on iOS Safari the keyboard leaves it alone.
let cache: { key: string; x: number; y: number } | undefined

/**
 * Get the screen origin of the web content, i.e. the offset to add to a page coordinate to reach the device
 * screen coordinates that Appium's XCUITest driver expects.
 *
 * Uses the global browser object from WDIO.
 */
const getWebContentOrigin = async () => {
  const raw = await browser.execute(() =>
    JSON.stringify({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      scale: window.visualViewport?.scale ?? 1,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    }),
  )
  const metrics = JSON.parse(raw) as ViewportMetrics
  const key = JSON.stringify(metrics)

  if (cache?.key !== key) {
    const start = Date.now()
    const { x, y } = await getNativeElementRect('//XCUIElementTypeOther[@name="em"]')
    cache = { key, x, y }
    // Logged so a CI run answers whether the origin can be cached across scroll changes too, which would take
    // the remaining misses close to zero: if `y + scrollY` holds steady while scrollY varies, the origin is
    // the scrolled content and that sum is the scroll-independent chrome inset to cache in its place.
    console.info(
      `Web content origin measured in ${Date.now() - start}ms: x ${x} y ${y} scrollY ${metrics.scrollY} y+scrollY ${y + metrics.scrollY} innerHeight ${metrics.innerHeight}`,
    )
  }

  return { x: cache.x, y: cache.y }
}

export default getWebContentOrigin
