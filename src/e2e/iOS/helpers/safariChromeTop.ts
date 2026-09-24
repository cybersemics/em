/**
 * Pixels of Safari chrome above the page: add this to a viewport (client) y to get the screen y that performActions
 * delivers touches in.
 *
 * MEASURED as a constant across both keyboard states — 11 taps in one run, every one landing at `aimScreenY - 60`
 * whether `visualViewport.offsetTop` was 0, 25, 31, 33 or 84. It does NOT vary with the visual viewport; correcting
 * for `offsetTop` double-counts and lands the touch that many pixels high.
 *
 * It holds only while Safari manages the scroll position itself: a `scrollTo(0, 0)` made while the keyboard is up
 * leaves the document scroll behind the visual viewport, and the touch then lands `offsetTop` px below its target.
 */
const SAFARI_CHROME_TOP = 60

export default SAFARI_CHROME_TOP
