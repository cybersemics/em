/**
 * IOS Safari caret spec for #4173 (documentation / synthetic-touch boundary).
 *
 * NOTE: A synthetic WebDriver touch CANNOT faithfully reproduce #4173. WDA / `performActions` /
 * `mobile: tap` all FORCE focus onto the tapped element, which bypasses the real-finger rapid-tap
 * FOCUS-suppression that causes the bug (on a real device the second rapid tap fires `touchend` but
 * no `focus`, so the cursor is never moved). The faithful, handler-level regression test lives in
 * src/components/__tests__/Editable.ts. This spec is retained to document the investigation: it
 * proves native-gesture taps at genuine sub-second gaps DO move the cursor, and it isolates the one
 * synthetic-input artifact (0ms coalescing) that superficially resembled — but was not — #4173.
 *
 * Isolated into its own spec file so it can be pinned to an iOS version whose Safari touch-adjustment
 * / rapid-tap focus handling was under investigation (see wdio.browserstack.conf.ts). The rest of the
 * iOS suite runs on the default device/version.
 */
import type { Element } from 'webdriverio'
import getEditingText from '../helpers/getEditingText'
import getNativeElementRect from '../helpers/getNativeElementRect'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'

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

/**
 * Seeds three sibling thoughts a/b/c, then taps thought `a` followed by `targetValue` in a single
 * atomic performActions chain whose in-chain pause is exactly `gapMs`. Returns the value of the
 * thought the cursor ends on (via getEditingText), so the caller can compare against the target.
 *
 * Both taps are dispatched together, from the NATIVE_APP context, with a finger-sized contact area so
 * iOS processes them like physical taps. Dispatching them as one chain is the only way to reach the
 * sub-100ms inter-tap gaps that two sequential `mobile: tap` calls (each ~375ms round-trip) cannot.
 */
const twoTap = async (targetValue: string, gapMs: number): Promise<string | undefined> => {
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
  const target = await waitForEditable(targetValue)

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
  // single sub-second action chain, the keyboard has not yet opened when the target is tapped, so its
  // pre-keyboard coordinate is the correct one at chain-execution time.
  const aPoint = await screenCenter(a)
  const targetPoint = await screenCenter(target)

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
        { type: 'pointerMove', duration: 0, x: targetPoint.x, y: targetPoint.y, origin: 'viewport', ...CONTACT },
        { type: 'pointerDown', button: 0, ...CONTACT },
        { type: 'pause', duration: HOLD_MS },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
  const elapsed = Date.now() - t0
  await browser.switchContext(webviewContext)

  // Give the app a moment to dispatch setCursor and re-render before reading the cursor position.
  await browser.pause(1000)
  const received = await getEditingText()
  console.info(`#4173 twoTap a->${targetValue} gap ${gapMs}ms: received "${received}" (chain ${elapsed}ms)`)
  return received
}

describe('Caret', () => {
  // Native-gesture taps at a genuine sub-second gap (>=25ms) DO move the cursor to the adjacent
  // thought. These pass on BrowserStack, confirming that synthetic native taps at these intervals
  // cannot reproduce #4173. The gap is the exact in-chain pause between the two taps.
  const ADJACENT_GAPS_MS = [25, 50, 75, 100]
  ADJACENT_GAPS_MS.forEach(gapMs => {
    it(`Set caret on adjacent thought ${gapMs}ms after tap (#4173)`, async () => {
      expect(await twoTap('b', gapMs)).toBe('b')
    })
  })

  // SKIPPED — synthetic-input artifact, not a faithful #4173 repro (kept for documentation).
  // At a literal 0ms in-chain gap, WDA/WebKit spatially COALESCES the two synthetic touches into a
  // single averaged tap: a->b lands back on "a", and the non-adjacent control a->c lands on the
  // geometric MIDPOINT "b" (not "c"). Genuine #4173 is a rapid-tap FOCUS-suppression bug that WDA
  // taps bypass entirely (they force focus onto the target). The faithful, handler-level regression
  // test is `#4173` in src/components/__tests__/Editable.ts. These two cases are skipped so CI stays
  // green while still recording the exact artifact boundary.
  it.skip('Set caret on adjacent thought 0ms after tap (#4173 — synthetic artifact, see Editable.ts)', async () => {
    expect(await twoTap('b', 0)).toBe('b')
  })

  it.skip('Set caret on non-adjacent thought 0ms after tap (#4173 control — synthetic artifact)', async () => {
    expect(await twoTap('c', 0)).toBe('c')
  })
})
