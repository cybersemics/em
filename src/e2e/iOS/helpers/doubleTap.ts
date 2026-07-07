import type { Element } from 'webdriverio'
import getElementRectByScreen from './getElementRectByScreen.js'

interface Options {
  // Milliseconds to pause between the release of the first tap and the press of the second tap.
  intervalMs?: number
  // Milliseconds each tap is held down before release.
  holdMs?: number
}

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
 * interval between the two taps. Both element coordinates are resolved up front so that the gap
 * between the taps is exactly intervalMs rather than incidental round-trip latency (which can exceed
 * a second and is the reason a hand-driven repro of #4173 is unreliable). Uses a real touch pointer
 * (pointerType: 'touch') so WebKit's rapid-tap gesture recognition is exercised the same way a
 * physical double tap would exercise it. See https://github.com/cybersemics/em/issues/4173.
 */
const doubleTap = async (first: Element, second: Element, { intervalMs = 300, holdMs = 60 }: Options = {}) => {
  const firstPoint = await centerOf(first)
  const secondPoint = await centerOf(second)

  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: firstPoint.x, y: firstPoint.y, origin: 'viewport' },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: holdMs },
        { type: 'pointerUp', button: 0 },
        { type: 'pause', duration: intervalMs },
        { type: 'pointerMove', duration: 0, x: secondPoint.x, y: secondPoint.y, origin: 'viewport' },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: holdMs },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
}

export default doubleTap
