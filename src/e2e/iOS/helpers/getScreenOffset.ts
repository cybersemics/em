import getNativeElementRect from './getNativeElementRect.js'

/** Metrics read from the web context in a single round trip: the ones that determine where the WebView's content sits on screen, plus the page scroll. */
interface ViewportMetrics {
  innerWidth: number
  innerHeight: number
  screenWidth: number
  screenHeight: number
  visualHeight: number
  scale: number
  offsetLeft: number
  offsetTop: number
  scrollX: number
  scrollY: number
}

// Measuring the native origin costs two context switches and an XCUITest XPath query over the whole
// accessibility tree, which is the slowest call in the suite — and tap needs the origin on every tap. It cannot
// be measured once and kept, because Safari's top bar collapses as the page scrolls and the content origin
// moves up with it. But the web viewport grows by exactly what the chrome gives up, so the viewport metrics are
// not merely correlated with the chrome state, they *are* it: cache the origin against them and re-measure only
// when they change. Deliberately not keyed on scroll position — scroll is what triggers the collapse, but
// innerHeight is what the collapse *is*, so keying on scroll would re-measure without catching anything extra.
let nativeOrigin: { key: string; x: number; y: number } | undefined

/**
 * Get the offset to add to WebView viewport coordinates to reach device screen coordinates, along with the
 * current page scroll.
 *
 * Appium's XCUITest driver always executes `performActions` in the native context, even while the WEBVIEW
 * context is active, so every coordinate handed to it must be screen-relative. DOM measurements are not.
 * `getBoundingClientRect` and `Range` rects are viewport-relative: add `x`/`y`. `browser.getElementRect` is
 * page-relative, since the W3C algorithm adds the window scroll: subtract `scrollX`/`scrollY` as well.
 *
 * Uses the global browser object from WDIO.
 */
const getScreenOffset = async () => {
  const raw = await browser.execute(() =>
    JSON.stringify({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      visualHeight: window.visualViewport?.height ?? 0,
      scale: window.visualViewport?.scale ?? 1,
      offsetLeft: window.visualViewport?.offsetLeft ?? 0,
      offsetTop: window.visualViewport?.offsetTop ?? 0,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    }),
  )
  const metrics = JSON.parse(raw) as ViewportMetrics

  const key = JSON.stringify([
    metrics.innerWidth,
    metrics.innerHeight,
    metrics.screenWidth,
    metrics.screenHeight,
    metrics.visualHeight,
    metrics.scale,
  ])

  if (nativeOrigin?.key !== key) {
    const start = Date.now()
    const { x, y } = await getNativeElementRect('//XCUIElementTypeOther[@name="em"]')
    nativeOrigin = { key, x, y }
    console.info(`Screen offset measured in ${Date.now() - start}ms: native origin x ${x} y ${y}`)
  }

  // Safari nests the web content in a native element that the browser chrome insets, so the inset shows up in
  // the native rect. Capacitor's web content fills the screen and the status bar inset shows up in the visual
  // viewport instead, leaving the native rect at the origin. Take whichever one is set. The max is recomputed
  // per call rather than cached, since the visual viewport also shifts under pinch-zoom panning.
  return {
    x: Math.max(nativeOrigin.x, metrics.offsetLeft),
    y: Math.max(nativeOrigin.y, metrics.offsetTop),
    scrollX: metrics.scrollX,
    scrollY: metrics.scrollY,
  }
}

export default getScreenOffset
