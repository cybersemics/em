/**
 * IOS Safari caret regression test for #4173.
 *
 * Isolated into its own spec file so it can be pinned to an iOS version whose Safari touch-adjustment
 * / rapid-tap focus handling reproduces the bug (see wdio.browserstack.conf.ts). The rest of the iOS
 * suite runs on the default device/version.
 */
import type { Element } from 'webdriverio'
import getEditingText from '../helpers/getEditingText'
import getNativeElementRect from '../helpers/getNativeElementRect'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'

// Sub-second inter-tap gaps (ms) that fall at or below WebKit's double-tap-to-zoom detection window
// (~300-350ms). Sequential `mobile: tap` calls cannot reach this window (each has a ~375ms WDA
// round-trip, a ~751ms floor for two taps), so the two taps are dispatched here as a SINGLE atomic
// performActions chain whose in-chain pause is the exact gap - the only way to probe the double-tap
// window at two distinct points.
const GAPS_MS = [0, 100, 200, 300]

// Milliseconds each tap is held down before release. Kept short so each tap reads as a crisp quick
// tap, the kind WebKit's rapid-tap / double-tap detection responds to.
const HOLD_MS = 20

// Finger-sized contact area for the touch. A zero-radius synthetic tap does not trigger Safari's
// touch-adjustment heuristic; only a real contact radius is processed like a physical finger (see
// https://github.com/cybersemics/em/pull/4407). Pressure is intentionally omitted: the iPhone 16
// hardware has no Force Touch, and a pressure field makes WDA attempt a force-press, which fails with
// "This device does not support force press interactions".
const CONTACT = { width: 40, height: 40 }

/** Absolute device-screen coordinate for a native touch. */
interface ScreenPoint {
  x: number
  y: number
}

describe('Caret', () => {
  GAPS_MS.forEach(gapMs => {
    it(`Set caret on adjacent thought ${gapMs}ms after tap (#4173)`, async () => {
      // Reproduces https://github.com/cybersemics/em/issues/4173: tapping an adjacent thought within
      // ~1 second of a previous tap fails to move the cursor (the second tap's setCursor is not
      // dispatched and focus is not triggered on the ContentEditable). A non-adjacent thought works.
      const importText = `
    - a
    - b
    - c`
      await paste(importText)
      await waitForEditable('c')

      // Stabilize layout so the touch coordinates resolve against a settled DOM.
      await browser.execute(() => window.scrollTo(0, 0))
      await browser.pause(400)

      const a = await waitForEditable('a')
      const b = await waitForEditable('b')

      // Cache the Safari webview container's screen offset ONCE (native touches use absolute screen
      // coordinates). The offset is a property of the browser chrome, not the page, so it is constant.
      const offset = await getNativeElementRect('//XCUIElementTypeOther[@name="em"]')

      /** Absolute screen center of an editable, using the cached container offset. */
      const screenCenter = async (editable: Element): Promise<ScreenPoint> => {
        const rect = await browser.getElementRect(editable.elementId)
        return {
          x: Math.round(rect.x + offset.x + rect.width / 2),
          y: Math.round(rect.y + offset.y + rect.height / 2),
        }
      }

      // Resolve both centers up front, while the keyboard is still closed. Because both taps fire in a
      // single sub-second action chain (below), the keyboard has not yet opened when b is tapped, so
      // b's pre-keyboard coordinate is the correct one at chain-execution time.
      const aPoint = await screenCenter(a)
      const bPoint = await screenCenter(b)

      // Dispatch BOTH taps in one atomic performActions chain from the NATIVE_APP context, with a
      // finger-sized contact area so iOS processes them like physical taps. The in-chain pause is the
      // exact inter-tap gap, letting us probe WebKit's double-tap window (<=300ms) that two sequential
      // `mobile: tap` calls cannot reach.
      const webviewContext = (await browser.getContext()) as string
      await browser.switchContext('NATIVE_APP')
      const t0 = Date.now()
      await browser.performActions([
        {
          type: 'pointer',
          id: 'finger1',
          parameters: { pointerType: 'touch' },
          actions: [
            { type: 'pointerMove', duration: 0, x: aPoint.x, y: aPoint.y, origin: 'viewport', ...CONTACT },
            { type: 'pointerDown', button: 0, ...CONTACT },
            { type: 'pause', duration: HOLD_MS },
            { type: 'pointerUp', button: 0 },
            { type: 'pause', duration: gapMs },
            { type: 'pointerMove', duration: 0, x: bPoint.x, y: bPoint.y, origin: 'viewport', ...CONTACT },
            { type: 'pointerDown', button: 0, ...CONTACT },
            { type: 'pause', duration: HOLD_MS },
            { type: 'pointerUp', button: 0 },
          ],
        },
      ])
      const elapsed = Date.now() - t0
      await browser.switchContext(webviewContext)
      console.info(`#4173 single-chain two-tap: chain took ${elapsed}ms (gap ${gapMs}ms, hold ${HOLD_MS}ms)`)

      // Give the app a moment to dispatch setCursor and re-render, then assert the cursor moved to b.
      await browser.pause(1000)
      expect(await getEditingText()).toBe('b')
    })
  })
})
