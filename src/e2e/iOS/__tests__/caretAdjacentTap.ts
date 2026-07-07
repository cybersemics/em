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

describe('Caret', () => {
  it('Set caret on adjacent thought within 1 second (#4173)', async () => {
    // Reproduces https://github.com/cybersemics/em/issues/4173: tapping an adjacent thought within
    // ~1 second of a previous tap fails to move the cursor (the second tap's setCursor is not
    // dispatched and focus is not triggered on the ContentEditable). A non-adjacent thought works.
    // doubleTap fires two real, finger-sized native touch taps with a deterministic sub-second
    // interval, which a hand-driven repro cannot reliably achieve. The interval is overridable via
    // TAP_INTERVAL_MS to probe the threshold.
    const intervalMs = process.env.TAP_INTERVAL_MS ? parseInt(process.env.TAP_INTERVAL_MS, 10) : 300

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
