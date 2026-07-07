/**
 * IOS Safari caret regression test for #4173.
 *
 * Isolated into its own spec file so it can be pinned to an iOS version whose Safari touch-adjustment
 * / rapid-tap focus handling reproduces the bug (see wdio.browserstack.conf.ts). The rest of the iOS
 * suite runs on the default device/version.
 */
import type { Element } from 'webdriverio'
import getEditingText from '../helpers/getEditingText'
import getElementRectByScreen from '../helpers/getElementRectByScreen'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'

// Sweep of inter-tap intervals (ms) to probe the #4173 trigger window. The issue describes the
// failure occurring "within 1 second" of the first tap, and WebKit's double-tap-to-zoom detection
// sits around ~300-350ms, so the bug may only surface for a subset of these intervals.
const INTERVALS_MS = [0, 150, 300, 500]

/** Absolute device-screen coordinate for a native `mobile: tap`. */
interface ScreenPoint {
  x: number
  y: number
}

/**
 * Resolve the absolute device-screen center of an editable. `mobile: tap` with no element uses
 * absolute *screen* coordinates, so the center is taken from getElementRectByScreen (which adds the
 * native Safari content offset), not from getBoundingClientRect (webview CSS coordinates, which would
 * land in the browser chrome above). This performs a NATIVE_APP context switch and is therefore slow
 * (~1-2s); it MUST be done up-front, never between the two measured taps (see below).
 */
const screenCenter = async (editable: Element): Promise<ScreenPoint> => {
  const rect = await getElementRectByScreen(editable)
  return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }
}

/**
 * Tap an absolute device-screen point with a native WebKit touch via Appium's `mobile: tap`. Unlike
 * `performActions` (which synthesizes low-level HID events at the WebDriver layer), `mobile: tap` is
 * processed through WebKit's touch/gesture recognizers - the same path a physical finger drives, and
 * the path #4173 depends on. Coordinates are pre-resolved so this call adds no context-switch latency.
 */
const nativeTap = async ({ x, y }: ScreenPoint): Promise<void> => {
  await browser.execute('mobile: tap', { x, y })
}

describe('Caret', () => {
  INTERVALS_MS.forEach(intervalMs => {
    it(`Set caret on adjacent thought ${intervalMs}ms after tap (#4173)`, async () => {
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

      // Prime the keyboard: tapping a thought opens the on-screen keyboard, which shifts the layout.
      // We must resolve the tap coordinates AFTER that shift settles, otherwise b's pre-keyboard
      // coordinate is stale. This priming tap also puts us in the real #4173 scenario (caret already
      // on a thought, keyboard open) before the measured rapid two-tap sequence.
      await nativeTap(await screenCenter(a))
      await browser.pause(700)

      // Pre-resolve BOTH screen coordinates now (each does a slow NATIVE_APP context switch). Doing
      // this up-front is essential: resolving b's rect *between* the two taps injected ~3s of latency,
      // pushing the second tap far outside #4173's sub-second window and masking the bug.
      const aPoint = await screenCenter(a)
      const bPoint = await screenCenter(b)

      // Rapid sequence: re-tap a, then within intervalMs tap the adjacent b, using native WebKit
      // touches. The only work between the taps is the interval pause, so the measured a->b gap
      // reflects intervalMs plus a single mobile:tap execution (no context switch).
      const t0 = Date.now()
      await nativeTap(aPoint)
      const t1 = Date.now()
      if (intervalMs) await browser.pause(intervalMs)
      await nativeTap(bPoint)
      const t2 = Date.now()
      console.info(`#4173 native-tap timing: first tap ${t1 - t0}ms, a->b gap ~${t2 - t1}ms (interval ${intervalMs}ms)`)

      // Give the app a moment to dispatch setCursor and re-render, then assert the cursor moved to b.
      await browser.pause(1000)
      expect(await getEditingText()).toBe('b')
    })
  })
})
