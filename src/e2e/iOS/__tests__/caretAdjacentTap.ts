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
 * This spec fixes the blind spot on two fronts. (A) Preconditions: #4173 only manifests when the
 * keyboard is ALREADY open (so `state.isKeyboardOpen` routes the second tap into handleTapBehavior's
 * defer-to-onFocus no-op branch), so each two-tap attempt first PRIMES the keyboard by tapping a
 * neutral thought, then — because opening the keyboard scrolls the thoughts up — scrolls back to the
 * top and RE-RESOLVES the pair at their keyboard-open positions. (B) Landing verification: every tap
 * point is verified to hit the intended thought, at two levels — geometry (`document.elementFromPoint`
 * at the tap's client center must resolve to the intended thought) and native touch (a single real
 * native tap on each thought in isolation must move the cursor to it). Only then are the two-tap
 * attempts run, so a "cursor moved" / "cursor stuck" outcome is trustworthy rather than a mistargeted
 * or coalesced tap.
 *
 * Coordinate spaces (critical): in the webview context `browser.getElementRect` and
 * `document.elementFromPoint` both use CLIENT (viewport) CSS coordinates. Native `performActions`
 * uses absolute SCREEN coordinates = client + the Safari webview container offset. The offset is a
 * property of the browser chrome, not the page, so it is cached once via a single NATIVE_APP switch.
 *
 * Isolated into its own spec file so it can be pinned to a specific iOS version (see
 * wdio.browserstack.conf.ts). The rest of the iOS suite runs on the default device/version.
 *
 * CONCLUSIVE RESULT: the two-tap block below reaches the exact real-device regime — two INDEPENDENT
 * rapid taps ~250ms apart (the v6 real-device inter-tap gap), fired as ONE performActions call with
 * two distinct pointer sources so they dodge WebKit's double-tap recognizer that had merged the
 * single-source atomic chain — and the cursor STILL moves correctly to the second thought (a->b -> b,
 * a->c -> c). This is the most faithful synthetic mechanism achievable, at the precise timing #4173
 * needs, and it does not reproduce the bug. It confirms that synthetic WDA taps force focus onto the
 * target regardless of timing, so #4173 (a real-finger focus-suppression bug) is UNREACHABLE via
 * synthetic input. These tests therefore assert the CORRECT behavior (both taps land and move the
 * cursor); they stand as a harness/landing sanity check and as executable documentation of that limit.
 * The faithful regression guard is the handler-level test in src/components/__tests__/Editable.ts.
 */
import type { Element } from 'webdriverio'
import getEditingText from '../helpers/getEditingText'
import getNativeElementRect from '../helpers/getNativeElementRect'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
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

// Inter-tap gap for the two-tap sequence. 250ms matches the ~249ms tap-to-tap interval measured when
// #4173 was reproduced by hand on a real device (on-device instrumentation, see session notes) — the
// realistic window a human hits, not the sub-100ms gaps that WDA spatially coalesces into one tap.
const TAP_GAP_MS = 250

/** Seed three sibling thoughts a/b/c and settle the layout so tap coordinates resolve against a
 * stable, keyboard-CLOSED, scroll-0 DOM. A prior tap (e.g. a calibration tap) leaves the keyboard
 * open, which pushes the thoughts up and out of view; dismiss it and scroll back to the top so every
 * test starts from the same known geometry. */
const seedThoughts = async (): Promise<void> => {
  await paste(`
    - a
    - b
    - c`)
  await waitForEditable('c')
  // Dismiss any lingering keyboard from a previous interaction before measuring coordinates — an open
  // keyboard scrolls the thoughts out of view and invalidates the resolved tap points.
  if (await browser.isKeyboardShown()) {
    await hideKeyboardByTappingDone()
  }
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

/** A finished single-tap gesture at one screen point: pointer down, brief hold, pointer up. */
const singleTapGesture = (point: { x: number; y: number }, pointerId: string) => [
  {
    type: 'pointer' as const,
    id: pointerId,
    parameters: { pointerType: 'touch' as const },
    actions: [
      { type: 'pointerMove' as const, duration: 0, x: point.x, y: point.y, origin: 'viewport', ...CONTACT },
      { type: 'pointerDown' as const, button: 0, ...CONTACT },
      { type: 'pause' as const, duration: HOLD_MS },
      { type: 'pointerUp' as const, button: 0 },
    ],
  },
]

/**
 * Two native taps — on `first` then `second`, `gapMs` apart — as a SINGLE performActions call using
 * TWO SEPARATE pointer sources (finger1, finger2) on one shared W3C clock. This is the key to reaching
 * the ~250ms window: one round-trip means the gap is chain-controlled and precise (no ~390ms
 * command-dispatch floor), while using two DISTINCT pointer sources — rather than one finger tapping
 * twice — aims to dodge WebKit's double-tap recognizer that merged the single-source atomic chain into
 * a gesture. The two sources' action lists are padded to equal length so their ticks align: finger1
 * taps at t=0, finger2 taps at t=HOLD+gapMs (i.e. gapMs after finger1's release).
 */
const twoSourceTwoTap = (first: { x: number; y: number }, second: { x: number; y: number }, gapMs: number) => {
  /** A pointerMove action to the given point (zero duration, finger-sized contact). */
  const move = (p: { x: number; y: number }) => ({
    type: 'pointerMove' as const,
    duration: 0,
    x: p.x,
    y: p.y,
    origin: 'viewport',
    ...CONTACT,
  })
  const down = { type: 'pointerDown' as const, button: 0, ...CONTACT }
  const up = { type: 'pointerUp' as const, button: 0 }
  /** A pause action of the given duration, used to align the two sources' ticks. */
  const pause = (duration: number) => ({ type: 'pause' as const, duration })
  return [
    {
      type: 'pointer' as const,
      id: 'finger1',
      parameters: { pointerType: 'touch' as const },
      // T0 move, T1 down, T2 hold, T3 up, T4 gap, T5-T8 idle (padding to align with finger2).
      actions: [move(first), down, pause(HOLD_MS), up, pause(gapMs), pause(0), pause(0), pause(HOLD_MS), pause(0)],
    },
    {
      type: 'pointer' as const,
      id: 'finger2',
      parameters: { pointerType: 'touch' as const },
      // Idle through finger1's tap + gap, then tap. Starts with a positioning move (no contact) so
      // WDA's "pause must be preceded by pointerMove" rule is satisfied; down happens at T6.
      actions: [move(second), pause(0), pause(HOLD_MS), pause(0), pause(gapMs), pause(0), down, pause(HOLD_MS), up],
    },
  ]
}

/** Fire a single native tap at an absolute screen point (finger-sized contact), from the NATIVE_APP
 * context, then return to the webview. */
const nativeTap = async (screen: { x: number; y: number }): Promise<void> => {
  const webviewContext = (await browser.getContext()) as string
  await browser.switchContext('NATIVE_APP')
  await browser.performActions(singleTapGesture(screen, 'finger1'))
  await browser.switchContext(webviewContext)
}

/**
 * Fire two native taps — on `first` then `second`, `gapMs` apart — from the NATIVE_APP context in a
 * single two-pointer-source performActions call (see twoSourceTwoTap for why). Returns the wall-clock
 * duration of the performActions call for logging. Because the timing is chain-controlled, the actual
 * inter-tap gap is gapMs by construction, not the returned wall-clock value.
 */
const nativeTwoTap = async (
  first: { x: number; y: number },
  second: { x: number; y: number },
  gapMs: number,
): Promise<number> => {
  const webviewContext = (await browser.getContext()) as string
  await browser.switchContext('NATIVE_APP')
  const t0 = Date.now()
  await browser.performActions(twoSourceTwoTap(first, second, gapMs))
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

describe('Caret single tap with keyboard open', () => {
  // The decisive control: does a SINGLE native tap move the cursor when the keyboard is ALREADY open?
  // Prime the keyboard by tapping `c`, scroll back to the top, re-resolve+verify the target, then tap
  // it ONCE. If the cursor moves to the target, synthetic taps DO deliver focus with the keyboard open
  // and any two-tap breakage is specific to the rapid pair (closer to #4173). If the cursor stays on
  // the primer `c`, synthetic taps simply do not deliver focus while the keyboard is open on this
  // harness — a limitation, not the bug.
  const TARGETS = ['a', 'b']
  TARGETS.forEach(value => {
    it(`single tap on "${value}" with keyboard open (primed by c) moves the cursor`, async () => {
      await seedThoughts()
      const safariOffset = await getNativeElementRect('//XCUIElementTypeOther[@name="em"]')

      const primer = await resolveVerifiedTapTarget('c', safariOffset)
      await nativeTap(primer.screen)
      await browser.waitUntil(async () => browser.isKeyboardShown(), {
        timeout: 10000,
        timeoutMsg: 'keyboard did not open after priming tap on "c"',
      })

      await browser.execute(() => window.scrollTo(0, 0))
      await browser.pause(400)
      const target = await resolveVerifiedTapTarget(value, safariOffset)

      await nativeTap(target.screen)
      await browser.pause(1000)

      const received = await getEditingText()
      console.info(`#4173 keyboard-open single tap "${value}" (primer c): cursor now on "${received}"`)
      expect(received).toBe(value)
    })
  })
})

describe('Caret #4173 two-tap repro', () => {
  /**
   * Reproduces the #4173 preconditions, then attempts the bug. First taps `primerValue` to OPEN the
   * keyboard and park the cursor away from the measured pair — #4173 only manifests when
   * `state.isKeyboardOpen` is already true, which routes the second tap into handleTapBehavior's
   * defer-to-onFocus no-op branch. Opening the keyboard scrolls the thoughts up, so the view is
   * scrolled back to the top and `first`/`second` are RE-RESOLVED (and re-verified) at their
   * keyboard-open positions before the rapid pair fires. Then taps `first` then `second` in one atomic
   * chain with an exact `gapMs` gap and returns the value the cursor ends on: `second` = the pair
   * moved the cursor correctly (no repro); `first` = the second tap fired but did not move the cursor
   * (candidate #4173); anything else = the second tap did not land where intended.
   */
  const primeAndTwoTap = async (
    primerValue: string,
    firstValue: string,
    secondValue: string,
    gapMs: number,
  ): Promise<string | undefined> => {
    await seedThoughts()
    const safariOffset = await getNativeElementRect('//XCUIElementTypeOther[@name="em"]')

    // Prime: tap a neutral thought to open the keyboard (and set the cursor there). This establishes
    // the keyboard-open precondition #4173 requires, without touching the measured pair. Retry the tap
    // once if the keyboard does not open (an occasional first-tap miss right after resetApp).
    const primer = await resolveVerifiedTapTarget(primerValue, safariOffset)
    await nativeTap(primer.screen)
    try {
      await browser.waitUntil(async () => browser.isKeyboardShown(), { timeout: 5000 })
    } catch {
      await nativeTap(primer.screen)
      await browser.waitUntil(async () => browser.isKeyboardShown(), {
        timeout: 8000,
        timeoutMsg: `keyboard did not open after priming tap on "${primerValue}"`,
      })
    }

    // The keyboard scrolled the thoughts out of view. Scroll back to the top and RE-RESOLVE the pair
    // at their current, keyboard-open positions so both taps land correctly (the pre-keyboard
    // coordinates are now stale).
    await browser.execute(() => window.scrollTo(0, 0))
    await browser.pause(400)
    const firstTarget = await resolveVerifiedTapTarget(firstValue, safariOffset)
    const secondTarget = await resolveVerifiedTapTarget(secondValue, safariOffset)

    const elapsed = await nativeTwoTap(firstTarget.screen, secondTarget.screen, gapMs)

    // Give the app a moment to dispatch setCursor and re-render before reading the cursor position.
    await browser.pause(1000)
    const received = await getEditingText()
    console.info(
      `#4173 prime "${primerValue}" then ${firstValue}->${secondValue} gap ${gapMs}ms: received "${received}" (measured gap ${elapsed}ms)`,
    )
    return received
  }

  // Adjacent pair a->b with the keyboard already open (primed by tapping c). This is the faithful
  // #4173 scenario, driven by two independent pointer sources ~250ms apart (see nativeTwoTap). On a
  // real device the second tap's focus is suppressed and the cursor sticks on "a" (the bug); with
  // synthetic WDA taps focus is forced onto "b", so the cursor moves and we get "b". Asserting "b"
  // documents that synthetic input cannot reproduce #4173 even at the exact real-device timing, and
  // guards that the verified taps actually take effect (no coalescing / no dropped tap).
  it(`adjacent tap a->b at ${TAP_GAP_MS}ms with keyboard open moves the cursor (#4173)`, async () => {
    expect(await primeAndTwoTap('c', 'a', 'b', TAP_GAP_MS)).toBe('b')
  })

  // Non-adjacent control a->c with the keyboard already open (primed by tapping b). Non-adjacent
  // re-taps deliver focus on a real device, so this should reach "c". If it does while a->b sticks on
  // "a", that is a genuine #4173 reproduction (adjacency-specific focus suppression), not a synthetic
  // artifact.
  it(`non-adjacent control a->c at ${TAP_GAP_MS}ms with keyboard open moves the cursor`, async () => {
    expect(await primeAndTwoTap('b', 'a', 'c', TAP_GAP_MS)).toBe('c')
  })
})
