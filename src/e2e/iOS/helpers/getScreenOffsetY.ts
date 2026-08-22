/**
 * Screen y to aim the calibration tap at. Needs to clear the browser chrome by enough that the tap lands in
 * the page whatever state the chrome is in, while staying inside the shortest viewport the suite runs on.
 */
const PROBE_SCREEN_Y = 320

/** Where the calibration is kept. On the page rather than in this module so that a reload invalidates it, which is what resetApp does before every test. */
interface CalibratedWindow extends Window {
  __tapScreenOffsetY?: number
  __tapProbeY?: number
  __tapCalibratedInnerHeight?: number
}

/**
 * Get the offset to add to a viewport y coordinate to reach the device screen y that Appium's XCUITest driver
 * expects, measuring it first if the page has reloaded or the browser chrome has changed since last time.
 *
 * The offset cannot be read off the accessibility tree. `//XCUIElementTypeOther[@name="em"]` looks like it
 * should give it, and `getElementRectByScreen` assumes so, but across two BrowserStack runs it reported 58,
 * 32, 30, 28, 26 and -31 for the same inset. The toolbar is the giveaway: two buttons at the same page
 * position measured 58 and 32, and the second tap landed 28px high and missed. Were those real chrome states,
 * the hardcoded `y: 60` this replaces would miss too, and it does not.
 *
 * So measure it directly, in the only terms not in question: aim a tap at a known screen point and ask the
 * page which `clientY` it received. The difference is the offset by construction, in exactly the frame
 * `performActions` uses, and it costs no native context switch.
 *
 * Note this is an offset from *viewport* coordinates. Do not apply it to the page coordinates
 * `browser.getElementRect` returns: for a `position: fixed` element such as the toolbar, the page y is just
 * the scroll offset, since the W3C algorithm adds the scroll to a bounding rect that is pinned at 0.
 *
 * Uses the global browser object from WDIO.
 */
const getScreenOffsetY = async (): Promise<number> => {
  // Safari's top bar collapses as the page scrolls and the offset shrinks with it. innerHeight grows by
  // exactly what the chrome gives up, so it identifies the chrome state — and unlike visualViewport.height it
  // does not also change every time the keyboard opens, which this suite does constantly.
  const cached = await browser.execute(() => {
    const win = window as CalibratedWindow
    return win.__tapScreenOffsetY !== undefined && win.__tapCalibratedInnerHeight === window.innerHeight
      ? win.__tapScreenOffsetY
      : null
  })
  if (cached !== null) return cached

  const probeX = await browser.execute(() => {
    const win = window as CalibratedWindow
    delete win.__tapProbeY
    // Record where the probe lands, and swallow it so it cannot disturb the app. preventDefault on a
    // capture-phase touchstart suppresses the synthesized mouse cascade and the click that would follow;
    // pointerdown has already fired by then, so the measurement still gets through.
    document.addEventListener('pointerdown', event => void (win.__tapProbeY = event.clientY), {
      capture: true,
      once: true,
    })
    document.addEventListener(
      'touchstart',
      event => {
        event.preventDefault()
        event.stopPropagation()
      },
      { capture: true, once: true },
    )
    return Math.round(window.innerWidth / 2)
  })

  await browser.performActions([
    {
      type: 'pointer',
      id: 'pointer1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: probeX, y: PROBE_SCREEN_Y, origin: 'viewport' },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 50 },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])

  const measured = await browser.execute((probeScreenY: number) => {
    const win = window as CalibratedWindow
    if (win.__tapProbeY === undefined) return ''
    win.__tapScreenOffsetY = probeScreenY - win.__tapProbeY
    win.__tapCalibratedInnerHeight = window.innerHeight
    return JSON.stringify({ offsetY: win.__tapScreenOffsetY, probeY: win.__tapProbeY, innerHeight: window.innerHeight })
  }, PROBE_SCREEN_Y)

  if (!measured) {
    throw new Error(
      `Tap calibration failed: a tap aimed at screen y ${PROBE_SCREEN_Y} never reached the page. It landed outside the web content, so the browser chrome is taller than the probe allows for.`,
    )
  }

  const { offsetY, probeY, innerHeight } = JSON.parse(measured) as {
    offsetY: number
    probeY: number
    innerHeight: number
  }
  console.info(`Tap offset calibrated: y ${offsetY} (probe landed at clientY ${probeY}, innerHeight ${innerHeight})`)

  return offsetY
}

export default getScreenOffsetY
