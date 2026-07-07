/**
 * IOS Safari caret regression test for #4173.
 *
 * Isolated into its own spec file so it can be pinned to an iOS version whose Safari touch-adjustment
 * / rapid-tap focus handling reproduces the bug (see wdio.browserstack.conf.ts). The rest of the iOS
 * suite runs on the default device/version.
 */
import doubleTap from '../helpers/doubleTap'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'

// Sweep of inter-tap intervals (ms) to probe the #4173 trigger window. The issue describes the
// failure occurring "within 1 second" of the first tap, and WebKit's double-tap-to-zoom detection
// sits around ~300-350ms, so the bug may only surface for a subset of these intervals.
const INTERVALS_MS = [120, 200, 300, 500, 800]

describe('Caret', () => {
  INTERVALS_MS.forEach(intervalMs => {
    it(`Set caret on adjacent thought ${intervalMs}ms after tap (#4173)`, async () => {
      // Reproduces https://github.com/cybersemics/em/issues/4173: tapping an adjacent thought within
      // ~1 second of a previous tap fails to move the cursor (the second tap's setCursor is not
      // dispatched and focus is not triggered on the ContentEditable). A non-adjacent thought works.
      // doubleTap fires two real, finger-sized native touch taps with a deterministic interval, which
      // a hand-driven repro cannot reliably achieve.
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

      // Tap a to set the caret (and open the keyboard), then within intervalMs tap the adjacent b.
      await doubleTap(a, b, { intervalMs })

      // Give the app a moment to dispatch setCursor and re-render, then assert the cursor moved to b.
      await browser.pause(1000)
      expect(await getEditingText()).toBe('b')
    })
  })
})
