/**
 * Pixels of Safari chrome above the page in mobile Safari.
 *
 * MEASURED as a constant across both keyboard states — 11 taps in one run, every one landing at `aimScreenY - 60`
 * whether `visualViewport.offsetTop` was 0, 25, 31, 33 or 84. It does NOT vary with the visual viewport; correcting
 * for `offsetTop` double-counts and lands the touch that many pixels high.
 *
 * It holds only while Safari manages the scroll position itself: a `scrollTo(0, 0)` made while the keyboard is up
 * leaves the document scroll behind the visual viewport, and the touch then lands `offsetTop` px below its target.
 */
export const SAFARI_CHROME_TOP = 60

/** Sessions whose platform has already been read. The platform cannot change within a session. */
const offsetBySession = new Map<string, number>()

/**
 * Get the pixels to add to a viewport (client) y to reach the screen y that performActions delivers touches in.
 *
 * The same helpers drive two platforms: the wdio suite runs mobile Safari, which has chrome above the page, and the
 * browser-control-ios bridge runs the Capacitor app, whose web view starts at the top of the screen. An attached
 * bridge session carries no browser name in its capabilities, so the page is asked instead.
 */
const getScreenOffsetY = async (): Promise<number> => {
  const cached = offsetBySession.get(browser.sessionId)
  if (cached !== undefined) return cached

  const isNativeApp = await browser.execute(
    () => !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.(),
  )
  const offset = isNativeApp ? 0 : SAFARI_CHROME_TOP
  offsetBySession.set(browser.sessionId, offset)
  return offset
}

export default getScreenOffsetY
