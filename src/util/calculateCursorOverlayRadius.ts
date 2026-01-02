import { isSafari, isTouch, isiPhone } from '../browser'

/**
 * Calculate the radius of the cursor overlay based on the device and browser.
 */
export default function calculateCursorOverlayRadius(): number {
  const isIOSSafari = isTouch && isiPhone && isSafari()
  return isIOSSafari ? 290 : 245
}
