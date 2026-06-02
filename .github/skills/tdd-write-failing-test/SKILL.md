---
name: tdd-write-failing-test
description: >-
  ALWAYS USE THIS SKILL immediately after reproducing a bug that has documented
  Steps to Reproduce, and before fixing it. Turns the reproduction into a permanent
  automated regression test and proves it fails for the right reason. Invoked by
  issue-repro after its Reproduce stage.
allowed-tools:
  - bash
---

You have just reproduced a bug by driving em's e2e helpers through the executor bridge (issue-repro → `browser-control`). Now turn that reproduction into a permanent **automated test**, *before* fixing the bug.

**Mandate (project):** every bug fix ships with an automated test.

This is **v1**: write a real failing test, run it locally, confirm it fails *for the right reason*, then hand back for the fix; validation later re-runs it green. Do **not** add `.skip` or any CI/TDD-inversion machinery — that is a deliberately later iteration.

## The core idea: the reproduction IS the test

You reproduced the bug by composing e2e helpers in a temp bridge script. A test composes the **same helpers** — only two things change:

- the **test fixture supplies `page` / `browser`**, so you drop the bridge `attachLivePage()` / `attachLiveSession()` line entirely;
- you add an **`expect()`** on the value you observed, asserting the **expected (fixed)** behaviour.

Because the helpers are identical, the transfer is near-free. Reuse the helper calls from your repro verbatim; do **not** re-derive interaction logic.

## Assertion direction (simpler than it looks)

Always assert the **expected** behaviour — the value the issue's *Expected Behavior* describes. Red-before-fix and green-after-fix then fall out automatically, because the reproduction handed you **both** numbers:

- the **buggy** value (e.g. Command Center overlay opacity `0`) **and** the **expected** value (`1`);
- write `expect(opacity).toBe('1')`. Pre-fix it fails (`'0' !== '1'`); post-fix it passes. No inversion logic needed.

## Step 1: One test, for the reported bug

Write **one** test for the behaviour the issue reports. If the issue lists several triggers for the same underlying bug (e.g. #4331: Export / Device Management / Settings all leave the Command Center transparent), pick **one** representative trigger — they share a root cause. Collateral / adjacent-behaviour coverage is out of scope here.

## Step 2: Append to an existing file, or create a new one

Search the platform's `__tests__` directory for existing coverage of this feature:

- `src/e2e/puppeteer/__tests__/` for web/android, `src/e2e/iOS/__tests__/` for iOS.
- If a file already covers this feature/area, **append an `it()`** to it.
- If none does, **create a new file** named for the feature in camelCase (e.g. `commandCenter.ts`).

Agent judgement — both are valid. Default to grouping with the nearest existing feature file; otherwise create one.

## Step 3: Author the test (reuse your repro; per-platform template)

The fixture handles app launch, navigation, and tutorial-skip **per test** — do not redo those inside the test. Start straight from your helper calls. Tap em controls through the **`click` / `tap` helper**, never a raw click (see `browser-control`'s fastClick trap).

### web / android — Vitest + puppeteer helpers (`src/e2e/puppeteer/__tests__/`)

```ts
import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import emulate from '../helpers/emulate'
import gesture from '../helpers/gesture'
import newThought from '../helpers/newThought'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('command center', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 15 Pro'])
  }, 10000)

  // Regression test for https://github.com/cybersemics/em/issues/4331
  it('overlay stays solid after a modal opened over it is closed', async () => {
    await newThought('hello world')
    await gesture('u') // swipe up → open Command Center
    await click('[data-testid="toolbar-icon"][aria-label="Settings"]') // open Settings modal
    await click('.modal__root > a') // close the modal
    const opacity = await page.$eval('[data-testid="command-center-overlay"]', el => getComputedStyle(el).opacity)
    expect(opacity).toBe('1') // solid, not transparent
  })
})
```

- The Command Center is **mobile-only** (`isTouch`); emulate a mobile device in `beforeEach`, mirroring `multiselect.ts`. (em reads its touch/layout profile at load — if a touch-gated feature fails to render, emulation may need to precede navigation; you confirm it renders in Step 5.)
- `setup.ts` already navigates + skips the tutorial before each test.

### iOS — WDIO + Mocha + iOS helpers (`src/e2e/iOS/__tests__/`)

```ts
import gesture from '../helpers/gesture'
import newThought from '../helpers/newThought'
import tap from '../helpers/tap'

describe('command center', () => {
  // Regression test for https://github.com/cybersemics/em/issues/4331
  it('overlay stays solid after a modal opened over it is closed', async () => {
    await newThought('hello world')
    await gesture('u') // swipe up → open Command Center

    const settings = await browser.$('[data-testid="toolbar-icon"][aria-label="Settings"]')
    await browser.execute((el: HTMLElement) => el.scrollIntoView({ inline: 'center', block: 'center' }), settings)
    await tap(settings) // open Settings modal

    await tap(await browser.$('.modal__root > a')) // close the modal

    const opacity = await browser.execute(
      () => getComputedStyle(document.querySelector('[data-testid="command-center-overlay"]')!).opacity,
    )
    expect(opacity).toBe('1') // solid, not transparent
  })
})
```

- The wdio `beforeTest` hook already clears storage, refreshes, and skips the tutorial — begin from your helper calls.
- Dismiss the keyboard (`hideKeyboardByTappingDone`) before a gesture if `newThought` left it up.

## Step 4: Add a stable assertion handle if none exists

If the element you assert on has **no stable selector** (no `data-testid` / `aria-label`), add a **minimal, additive `data-testid`** to it in the app source and commit it with the test. This is a *test hook*, not the fix — add only the attribute; change no behaviour or styling. Prefer an existing stable selector; only add a hook when there is none.

> Example (#4331): the overlay whose opacity flips has no testid, so add `data-testid="command-center-overlay"` to the overlay `motion.div` in `src/components/CommandCenter/CommandCenter.tsx`.

## Step 5: Prove it fails for the right reason (the gate)

Run the new test against the **current, unfixed** code by executing the **`run-test`** skill (it knows the single-test command per platform). The test MUST fail — and it must fail **on your assertion**, with the expected/received diff matching the reproduction (e.g. `expected '1', received '0'`).

- ✅ Fails on the assertion, showing the buggy value you observed → **valid failing test. Proceed.**
- ❌ Fails on a **timeout, missing selector, setup error, or anything other than the assertion** → the *test* is wrong, not the bug. Fix the **test** (never the app) and re-run via `run-test` until it fails red on the intended assertion.

A test that errors for the wrong reason is the core hallucination risk: it looks like coverage but proves nothing. Do not accept it.

## Step 6: Hand back

Once the test fails for the right reason, hand back to the caller. The fix proceeds in the normal flow (plan → implement). After the fix, **validation re-runs this same test via `run-test` and it must pass** — that green run replaces the old manual re-reproduction.
