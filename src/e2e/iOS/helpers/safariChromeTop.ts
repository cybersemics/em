/**
 * Pixels of Safari chrome above the page: add this to a viewport (client) y to get the screen y that performActions
 * delivers touches in.
 *
 * MEASURED as a constant across both keyboard states — 11 taps in one run, every one landing at `aimScreenY - 60`
 * whether `visualViewport.offsetTop` was 0, 25, 31, 33 or 84. It does NOT vary with the visual viewport; correcting
 * for `offsetTop` double-counts and lands the touch that many pixels high.
 *
 * It holds only while Safari manages the scroll position itself. See `__tests__/viewportCoordinates.ts`, which aims a
 * touch through this constant with and without a `scrollTo(0, 0)` made while the keyboard is up.
 */
const SAFARI_CHROME_TOP = 60

export default SAFARI_CHROME_TOP
