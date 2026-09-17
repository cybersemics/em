---
title: Measuring a layout shift when test timing has collapsed the animation
date: 2026-09-17
category: testing
module: e2e_puppeteer
problem_type: test_failure
component: testing_framework
symptoms:
  - "A requestAnimationFrame probe reports one stable y and the test passes on a thought that visibly drifts"
  - "The same probe detects the drift in real Chrome, and goes silent as soon as transitions are disabled"
  - "A measurement installed after the user action reports a zero delta"
  - "A run in which no style mutation ever arrives passes rather than timing out"
root_cause: zeroed_test_timing
resolution_type: test_fix
severity: medium
tags:
  - puppeteer
  - mutationobserver
  - animations
  - layout-shift
  - false-negative
  - e2e
---

# Measuring a layout shift when test timing has collapsed the animation

## Problem

A newly inserted tree-node is placed from its previous sibling's cached height, the sibling is re-measured shorter, and the node jumps 2.25–4.5px on the next commit — the drift reported in #3647, #3671 and the cluster #3672 collects. The mechanism is the "New-cliff anticipation" case in [`usePositionedThoughts`](../../layout-rendering.md#usepositionedthoughts-x-and-y) over [cliff padding](../../glossary.md#c); #3672 ruled the cause out of scope and asked only for coverage.

Coverage is where it gets interesting. `navigator.webdriver` zeroes every animation duration — the CSS half through the `data-env` attribute [`index.html`](../../../index.html) sets before React mounts, the JS half through [`durations.ts`](../../../src/util/durations.ts) — and [testing.md → Never wait for wall-clock time](../../testing.md#3-never-wait-for-wall-clock-time-wait-for-the-response) states the premise while [Animation durations live in JS](animation-durations-single-source.md) covers both paths. The consequence neither draws is this one: **zeroing does not merely make production timing irrelevant, it makes intermediate layout states unobservable by frame sampling.** The provisional `top` and the corrected `top` are both assigned within a single frame, so no frame ever paints the intermediate geometry, and a probe that samples the painted box can only ever see the end state.

That probe does not fail loudly. It returns one stable value, computes a delta of zero, and passes — on a tree that has the bug. It is an instance of [testing.md → Make false positives difficult](../../testing.md#7-make-false-positives-difficult), not of a probe that is merely slower than it should be.

## Symptoms

- `requestAnimationFrame` + `getBoundingClientRect().y` on the `[aria-label="tree-node"]` reports a single stable value across every frame under Puppeteer.
- The identical script in real Chrome resolves the shift frame by frame — until `[data-path]{transition:none!important}` is injected, after which it reports the same single value.
- A probe installed after the triggering action first runs at frame n+1, by which point the element already carries the corrected value, so the delta is zero for a second, independent reason.

## What Didn't Work

**rAF + `getBoundingClientRect`** — proposed in #3672 ("Perhaps `requestAnimationFrame` will provide adequate opportunities to measure the y position before and after"), then built twice: once as a Puppeteer measurement, once as a console script driven by hand in Chrome. The Chrome run worked and the Puppeteer run did not, which read as a Puppeteer problem until the contributor injected `[data-path]{transition:none!important}` into the live page and reproduced the silence in Chrome. That is what pinned the cause on the zeroed durations rather than on the driver. Starting the rAF earlier does not rescue it either — with no intermediate paint there is nothing for an earlier frame to catch.

**A no-op `page.evaluate` as a sleep** (`yieldForPendingEvaluate`, exported to the test files) to let the observer register. Rejected in review of #4254 as a new wait primitive that crosses the page boundary, and as one some tests called and some did not with nothing in the signature to say which. The order the review named for waiting inside the page instead: `queueMicrotask`, `setTimeout`, `requestAnimationFrame`, and a `sleep` only as the worst case.

**A `layoutShiftObserverReady` flag on `window.em.testFlags`** for the same race, tried next and dropped once the two-step `{ measurePromise }` await landed: after the first `await` the observer is already installed, so the flag changed nothing.

**A 500 ms debounce** that waited for `top` to settle before resolving, so the reported `after` would be the final position rather than the first change. Cut to first-change-wins when review asked whether a node is ever rendered at A, then B, then A again. It is not, so the settle window was buying nothing and costing half a second per assertion.

## Solution

[`layout-shift.ts`](../../../src/e2e/puppeteer/__tests__/layout-shift.ts) measures the **assigned** inline style rather than the painted box. `measureYShift` observes `document.body` and resolves on the first `top` that changes:

```ts
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style'],
  attributeOldValue: true,
})
```

The `childList` insertion identifies the target by `[data-editable]` text and `.closest('[aria-label="tree-node"]')`, seeding `before`. The first `attributes` mutation supplies the true initial `top` from `m.oldValue` — by the time that callback runs, `target.getAttribute('style')` already holds the corrected value, so `attributeOldValue: true` is the measurement, not a convenience. `expectStableY` asserts the delta against `Y_TOLERANCE` (0.5px), after asserting that neither reading is null.

Ordering is the other half. The Promise executor — `observe()` included — runs synchronously in the page, but `page.evaluate` itself is async across CDP, so `measureYShift` returns `{ measurePromise }` and the test awaits it *after* acting, with one in-page microtask yielded to guarantee setup landed first:

```ts
const { measurePromise } = await measureYShift('')
await press('Enter')
expectStableY(await measurePromise)
```

`page` is the live binding from [`../session`](../../../src/e2e/puppeteer/session.ts).

## Why This Works

The style attribute is written whether or not a frame paints between the two writes, so the signal survives exactly the collapse that destroys the frame-sampled one. React assigns both values; the compositor only ever renders the second.

It also avoids the alternative that looks obvious from the failure: restoring production timing so an intermediate frame exists to sample. [testing.md → Sanctioned Backdoors](../../testing.md#sanctioned-backdoors) already carries that decision in its `reloadWithProductionTiming` row — spoofing `navigator.webdriver` is reserved for a state that cannot exist under test timing, not a synchronization tactic, and not something to reach for when the state is measurable without it.

This is the second instance of a pattern, not a discovery. [`formatLetterCase`](../../cursor-and-caret.md#caret--browser-selection) restores a text range by observing the editable's mutation, after #4985 showed that an rAF deferral lands on the old text. Production code and test code arrived at the same move against different failures — rAF deferral misses a React-driven DOM update, so observe the mutation instead. It qualifies [Philosophy](../../cursor-and-caret.md#philosophy), which says to use `requestAnimationFrame` when deferring to the next paint: under test timing there may be no intermediate paint to defer to.

## Prevention

- Before sampling frames for a transient state, ask whether that state is ever painted once durations are zero. If the app expresses it as an inline style, a class, or an attribute, observe the attribute — `attributeOldValue` recovers the value the frame never showed.
- Keep the `m.target === target` filter. The observer sees every `style` mutation under `document.body`, and [`TreeNodePositioner`](../../../src/components/TreeNodePositioner.tsx) renders an inner div that takes an inline `top` of its own during a swap animation, alongside the outer div that carries `aria-label="tree-node"`, `data-path`, and the `top` under measurement.
- Preserve the `{ measurePromise }` shape when touching `measureYShift`. It is what forces install-then-act-then-await; collapsing it into a single `await` puts the observer in place after the action and restores the zero-delta false pass.
- `OBSERVER_READY_TIMEOUT_MS` (8000) **resolves** rather than rejects once a target has been found, so a run in which no style mutation ever arrives reports `before === after` and passes. A new case must therefore be watched fail against a tree that has the bug before it is landed green — [testing.md → A red test must fail for the right reason](../../testing.md#a-red-test-must-fail-for-the-right-reason).

## Related

- #3672 — the coverage request; #4182 and #4254 — the pull requests; #3647 and #3671 — the drift being measured
- [layout-rendering.md → `usePositionedThoughts` (x and y)](../../layout-rendering.md#usepositionedthoughts-x-and-y) — why the provisional y is wrong in the first place
- [testing.md → Never wait for wall-clock time](../../testing.md#3-never-wait-for-wall-clock-time-wait-for-the-response), [Make false positives difficult](../../testing.md#7-make-false-positives-difficult), [Sanctioned Backdoors](../../testing.md#sanctioned-backdoors)
- [Animation durations live in JS, not in Panda tokens](animation-durations-single-source.md)
- [cursor-and-caret.md → Caret / Browser Selection](../../cursor-and-caret.md#caret--browser-selection) — the production-code sibling of the same move
