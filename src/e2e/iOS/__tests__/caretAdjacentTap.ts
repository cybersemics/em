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
 * Tap an absolute device-screen point with a native WebKit touch via Appium's `mobile: tap`. Unlike
 * `performActions` (which synthesizes low-level HID events at the WebDriver layer), `mobile: tap` is
 * processed through WebKit's touch/gesture recognizers - the same path a physical finger drives, and
 * the path #4173 depends on. `mobile: tap` with no element uses absolute *screen* coordinates.
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

      // Cache the Safari webview container's screen offset ONCE. `mobile: tap` uses absolute screen
      // coordinates, so each editable's on-screen center is its webview rect plus this offset. The
      // offset is a property of the browser chrome layout, not the page, so it is constant across the
      // two taps - caching it lets us re-read each editable's (fast, webview-context) rect without a
      // NATIVE_APP context switch between the taps. That switch previously injected ~3s of latency,
      // pushing the second tap outside #4173's sub-second window and masking the bug.
      const offset = await getNativeElementRect('//XCUIElementTypeOther[@name="em"]')

      /** Absolute screen center of an editable, using the cached container offset (no context switch). */
      const screenCenter = async (editable: Element): Promise<ScreenPoint> => {
        const rect = await browser.getElementRect(editable.elementId)
        return {
          x: Math.round(rect.x + offset.x + rect.width / 2),
          y: Math.round(rect.y + offset.y + rect.height / 2),
        }
      }

      // Tap a to set the caret (and open the keyboard), then within intervalMs tap the adjacent b,
      // using native WebKit touches. b's rect is re-read just before its tap so it reflects any layout
      // shift from the keyboard opening; because that read stays in the webview context it is fast, so
      // the measured a->b gap reflects intervalMs plus lightweight rect reads and mobile:tap execution.
      const t0 = Date.now()
      await nativeTap(await screenCenter(a))
      const t1 = Date.now()
      if (intervalMs) await browser.pause(intervalMs)
      await nativeTap(await screenCenter(b))
      const t2 = Date.now()
      console.info(`#4173 native-tap timing: first tap ${t1 - t0}ms, a->b gap ~${t2 - t1}ms (interval ${intervalMs}ms)`)

      // Give the app a moment to dispatch setCursor and re-render, then assert the cursor moved to b.
      await browser.pause(1000)
      expect(await getEditingText()).toBe('b')
    })
  })
})
