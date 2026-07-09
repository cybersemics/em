/**
 * IOS Safari caret spec for #4173 — synthetic-touch repro attempt WITH per-tap landing verification.
 *
 * Background: a synthetic WebDriver touch has never faithfully reproduced #4173, because WDA /
 * `performActions` / `mobile: tap` force focus onto the tapped element, bypassing the real-finger
 * rapid-tap FOCUS-suppression that causes the bug (the faithful handler-level regression test lives in
 * src/components/__tests__/Editable.ts). Every prior synthetic attempt was also undermined by a
 * second, separate problem: we could never be sure the two taps actually LANDED on the intended
 * thoughts. A "cursor moved to b" result could hide a mistargeted tap, and a "cursor stuck on a" could
 * be a dropped/missed second tap rather than the bug. At a 0ms in-chain gap the two touches were even
 * spatially COALESCED into a single averaged tap (a->c landed on the geometric midpoint b).
 *
 * This spec fixes the blind spot: every tap point is verified to land on the correct element before it
 * is used, at two levels. (1) Geometry: `document.elementFromPoint` at the tap's client center must
 * resolve to the intended thought (deterministic, perturbs no state). (2) Native touch: a single real
 * native tap on each thought in isolation must move the cursor to it, proving the SCREEN coordinates
 * land correctly through the actual touch path. Only then are the two-tap repro attempts run, so their
 * outcomes are trustworthy.
 *
 * Coordinate spaces (critical): in the webview context `browser.getElementRect` and
 * `document.elementFromPoint` both use CLIENT (viewport) CSS coordinates. Native `performActions`
 * uses absolute SCREEN coordinates = client + the Safari webview container offset. The offset is a
 * property of the browser chrome, not the page, so it is cached once via a single NATIVE_APP switch.
 *
 * Isolated into its own spec file so it can be pinned to a specific iOS version (see
 * wdio.browserstack.conf.ts). The rest of the iOS suite runs on the default device/version.
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

/** A resolved tap target: the client (viewport) center for geometry checks and the absolute screen
 * center for native performActions, plus the value we expect a tap there to hit. */
interface TapTarget {
  value: string
  client: { x: number; y: number }
  screen: { x: number; y: number }
}

/** Seed three sibling thoughts a/b/c and settle the layout so tap coordinates resolve against a
 * stable, keyboard-closed DOM. */
const seedThoughts = async (): Promise<void> => {
  await paste(`
    - a
    - b
    - c`)
  await waitForEditable('c')
  await browser.execute(() => window.scrollTo(0, 0))
  await browser.pause(400)
}

/** The value of the thought whose editable is at the given CLIENT (viewport) point, or a marker
 * describing what else is there. Used to verify a tap coordinate lands on the intended thought
 * without actually tapping (elementFromPoint uses client coordinates, same as getElementRect). */
const editableValueAtClientPoint = (x: number, y: number): Promise<string | null> =>
  browser.execute(
    (px: number, py: number) => {
      const el = document.elementFromPoint(px, py) as HTMLElement | null
      if (!el) return null
      const editable = (el.closest('[data-editable]') || el.querySelector('[data-editable]')) as HTMLElement | null
      if (editable) return editable.innerHTML
      // Not on an editable — report the tag/testid so failures are diagnosable.
      return `<non-editable: ${el.getAttribute('data-testid') || el.tagName.toLowerCase()}>`
    },
    x,
    y,
  )

/** Resolve a thought's client + screen tap centers, and HARD-ASSERT that its client center actually
 * lands on that thought's editable (geometry verification). Fails loudly with the mismatching value
 * if the coordinate would hit the wrong element. */
const resolveVerifiedTapTarget = async (value: string, safariOffset: { x: number; y: number }): Promise<TapTarget> => {
  const editable: Element = await waitForEditable(value)
  const rect = await browser.getElementRect(editable.elementId)
  const client = { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }
  const screen = { x: Math.round(client.x + safariOffset.x), y: Math.round(client.y + safariOffset.y) }

  const hit = await editableValueAtClientPoint(client.x, client.y)
  console.info(
    `#4173 resolve "${value}": client (${client.x},${client.y}) hits "${hit}" | screen (${screen.x},${screen.y})`,
  )
  expect(hit).toBe(value)

  return { value, client, screen }
}

/** Fire a single native tap at an absolute screen point (finger-sized contact), from the NATIVE_APP
 * context, then return to the webview. */
const nativeTap = async (screen: { x: number; y: number }): Promise<void> => {
  const webviewContext = (await browser.getContext()) as string
  await browser.switchContext('NATIVE_APP')
  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: screen.x, y: screen.y, origin: 'viewport', ...CONTACT },
        { type: 'pointerDown', button: 0, ...CONTACT },
        { type: 'pause', duration: HOLD_MS },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
  await browser.switchContext(webviewContext)
}

/** Fire two native taps — on `first` then `second` — in a single atomic performActions chain whose
 * in-chain pause is exactly `gapMs`. Dispatching them as one chain is the only way to reach sub-100ms
 * inter-tap gaps that two sequential native taps (each ~375ms round-trip) cannot. */
const nativeTwoTap = async (
  first: { x: number; y: number },
  second: { x: number; y: number },
  gapMs: number,
): Promise<number> => {
  const webviewContext = (await browser.getContext()) as string
  await browser.switchContext('NATIVE_APP')
  const t0 = Date.now()
  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: first.x, y: first.y, origin: 'viewport', ...CONTACT },
        { type: 'pointerDown', button: 0, ...CONTACT },
        { type: 'pause', duration: HOLD_MS },
        { type: 'pointerUp', button: 0 },
        { type: 'pause', duration: gapMs },
        { type: 'pointerMove', duration: 0, x: second.x, y: second.y, origin: 'viewport', ...CONTACT },
        { type: 'pointerDown', button: 0, ...CONTACT },
        { type: 'pause', duration: HOLD_MS },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
  const elapsed = Date.now() - t0
  await browser.switchContext(webviewContext)
  return elapsed
}

describe('Caret tap-landing calibration', () => {
  // Prove that a single native tap at each thought's resolved screen center actually moves the cursor
  // to that thought. This validates the coordinate math and the native touch path BEFORE any two-tap
  // repro attempt, so a later "cursor did not move" result cannot be blamed on a mistargeted tap.
  const VALUES = ['a', 'b', 'c']
  VALUES.forEach(value => {
    it(`single native tap lands on "${value}"`, async () => {
      await seedThoughts()
      const safariOffset = await getNativeElementRect('//XCUIElementTypeOther[@name="em"]')
      const target = await resolveVerifiedTapTarget(value, safariOffset)

      await nativeTap(target.screen)
      await browser.pause(1000)

      const received = await getEditingText()
      console.info(`#4173 calibration single tap "${value}": cursor now on "${received}"`)
      expect(received).toBe(value)
    })
  })
})

describe('Caret #4173 two-tap repro', () => {
  /**
   * Seeds a/b/c, verifies BOTH tap points land on their intended thoughts (geometry), then taps `a`
   * followed by `targetValue` in a single atomic chain with an exact `gapMs` gap. Returns the value
   * the cursor ends on. Because both landings are verified first, the returned value is trustworthy:
   * `a` = the second tap did not move the cursor (candidate #4173 / dropped tap), `targetValue` = it
   * moved correctly, anything else = the two taps were coalesced/misrouted by the touch layer.
   */
  const twoTap = async (targetValue: string, gapMs: number): Promise<string | undefined> => {
    await seedThoughts()
    const safariOffset = await getNativeElementRect('//XCUIElementTypeOther[@name="em"]')

    // Resolve + verify both tap points up front, while the keyboard is closed. Both taps fire in one
    // sub-second chain, so the keyboard has not opened when the target is tapped — the pre-keyboard
    // coordinate is the one in effect at chain-execution time.
    const aTarget = await resolveVerifiedTapTarget('a', safariOffset)
    const target = await resolveVerifiedTapTarget(targetValue, safariOffset)

    const elapsed = await nativeTwoTap(aTarget.screen, target.screen, gapMs)

    // Give the app a moment to dispatch setCursor and re-render before reading the cursor position.
    await browser.pause(1000)
    const received = await getEditingText()
    console.info(`#4173 twoTap a->${targetValue} gap ${gapMs}ms: received "${received}" (chain ${elapsed}ms)`)
    return received
  }

  // Adjacent case (a->b). With landing verified, a "b" result means both taps hit correctly and the
  // cursor moved (no repro at this gap); an "a" result means the verified-correct second tap failed to
  // move the cursor — a genuine #4173 signal. Asserting "b" makes CI go red only if the bug actually
  // reproduces at that gap.
  const ADJACENT_GAPS_MS = [17, 34, 50, 75, 100]
  ADJACENT_GAPS_MS.forEach(gapMs => {
    it(`adjacent tap a->b at ${gapMs}ms lands and moves the cursor (#4173)`, async () => {
      expect(await twoTap('b', gapMs)).toBe('b')
    })
  })

  // Non-adjacent control (a->c). Both points are verified to land on a and c, so if the cursor ends on
  // anything other than "c" — notably the midpoint "b" — the atomic chain itself coalesced/misrouted
  // the taps. This is the direct guard the investigation was missing: it distinguishes a real focus
  // bug from a synthetic-input artifact.
  const CONTROL_GAPS_MS = [17, 34, 50]
  CONTROL_GAPS_MS.forEach(gapMs => {
    it(`non-adjacent control a->c at ${gapMs}ms lands and moves the cursor`, async () => {
      expect(await twoTap('c', gapMs)).toBe('c')
    })
  })
})
