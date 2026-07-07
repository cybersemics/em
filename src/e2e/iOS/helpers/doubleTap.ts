import type { Element } from 'webdriverio'
import getElementRectByScreen from './getElementRectByScreen.js'

interface Options {
  // Milliseconds to pause between the release of the first tap and the press of the second tap.
  intervalMs?: number
  // Milliseconds each tap is held down before release.
  holdMs?: number
}

// Finger-sized contact area for the touch. A zero-radius synthetic tap does not trigger Safari's
// touch-adjustment heuristic; only a real contact area (with pressure) is processed like a physical
// finger. See https://github.com/cybersemics/em/pull/4407.
const CONTACT = { width: 40, height: 40, pressure: 0.9 }

/**
 * Computes the center point of an element in native screen coordinates.
 * Touch pointer actions on iOS Safari (XCUITest) are interpreted in screen coordinates, unlike the
 * mouse pointer used by the `tap` helper which uses web viewport coordinates. The screen rect
 * adds the native Safari content offset so the touch lands on the element.
 */
const centerOf = async (nodeHandle: Element) => {
  const exists = await nodeHandle.isExisting()
  if (!exists) throw new Error('Element does not exist in the DOM.')
  const rect = await getElementRectByScreen(nodeHandle)
  if (!rect) throw new Error('Bounding box of element not found.')
  return {
    x: Math.round(rect.x + rect.width / 2),
    y: Math.round(rect.y + rect.height / 2),
  }
}

/**
 * Taps two elements in quick succession with a single touch pointer, with a precisely controlled
 * interval between the two taps. Both element coordinates are resolved up front (in the webview
 * context) so that the gap between the taps is exactly intervalMs rather than incidental round-trip
 * latency, which can exceed a second and is the reason a hand-driven repro of #4173 is unreliable.
 *
 * The taps are dispatched from the NATIVE_APP context using a finger-sized contact area
 * (width/height/pressure), so iOS processes them like a physical double tap and Safari's
 * touch-adjustment / rapid-tap focus handling is exercised the same way real hardware exercises it.
 * A zero-radius webview-context tap bypasses that native handling and cannot reproduce #4173.
 * See https://github.com/cybersemics/em/issues/4173 and https://github.com/cybersemics/em/pull/4407.
 */
const doubleTap = async (first: Element, second: Element, { intervalMs = 300, holdMs = 60 }: Options = {}) => {
  // Resolve both centers while still in the webview context (element handles are webview-scoped).
  const firstPoint = await centerOf(first)
  const secondPoint = await centerOf(second)

  const webviewContext = (await browser.getContext()) as string
  await browser.switchContext('NATIVE_APP')
  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: firstPoint.x, y: firstPoint.y, origin: 'viewport', ...CONTACT },
        { type: 'pointerDown', button: 0, ...CONTACT },
        { type: 'pause', duration: holdMs },
        { type: 'pointerUp', button: 0 },
        { type: 'pause', duration: intervalMs },
        { type: 'pointerMove', duration: 0, x: secondPoint.x, y: secondPoint.y, origin: 'viewport', ...CONTACT },
        { type: 'pointerDown', button: 0, ...CONTACT },
        { type: 'pause', duration: holdMs },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
  await browser.switchContext(webviewContext)
}

export default doubleTap
