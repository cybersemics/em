---
title: Never add a stacking-context property to the snapshot stylesheet
date: 2026-09-17
category: testing
module: e2e_puppeteer
problem_type: test_failure
component: testing_framework
symptoms:
  - A modal, popover or sidebar renders behind content it should cover, but only in the snapshot
  - The simulateDrop drop targets in drag-and-drop snapshots paint in the wrong order
  - A snapshot passes only when its call site opts out of part of the screenshot helper's stylesheet
  - Text-heavy snapshots differ between a local run and CI by a few antialiased pixels
root_cause: stacking_context
resolution_type: test_fix
severity: medium
tags:
  - puppeteer
  - snapshots
  - antialiasing
  - stacking-context
  - z-index
  - flake
---

# Never add a stacking-context property to the snapshot stylesheet

## Problem

Never add a property that creates a stacking context or a containing block — `perspective`, a non-`none` `transform` or `filter`, `will-change: transform` — to the universal selector in [`screenshot.ts`](../../../src/e2e/puppeteer/helpers/screenshot.ts) in order to chase crisper glyphs. On `*, *::before, *::after` it hands every element in the page its own stacking context, and it does not come back as a rendering difference. It comes back as z-index flake in the `modal`, `sidebar`, `ui` and `drag-and-drop` snapshot suites.

Three commits wrote that rule:

| Commit | What it did |
| --- | --- |
| 0b18b89b7a (#3164) | Introduced the antialiasing stylesheet to make text rendering deterministic, and with it `perspective: 1000px` / `-webkit-perspective: 1000px`, under a comment reading "Force hardware acceleration and disable subpixel rendering". Five of the drag-and-drop snapshots in that pull request drew a one-word review comment: `z-index`. |
| 3749dc0932 (#3830) | Merged `screenshot-with-no-antialiasing` back into `screenshot` behind `hardwareAcceleration?: boolean`, defaulting to `true`, with `modal.ts`, `drag-and-drop.ts`, `sidebar.ts` and `ui.ts` passing `false`. |
| a98ba4b6d7 (#3854) | Deleted `perspective` / `-webkit-perspective` and the flag with them, kept `backface-visibility: hidden`, changed `text-rendering` from `optimizeSpeed` to `geometricPrecision`, and regenerated 69 snapshots inside a 74-file commit. |

The causal chain was written down exactly once, in the JSDoc a98ba4b6d7 removed (`git show a98ba4b6d7 -- src/e2e/puppeteer/helpers/screenshot.ts`):

```ts
/**
 * If true, applies CSS that promotes layers for GPU rendering (backface-visibility, perspective).
 * Helps keep text and heavy/custom fonts visually consistent across snapshots (especially in CI).
 * When true, these properties create new stacking contexts and can break z-index ordering (e.g.
 * modals, popovers, tooltips appearing behind other content). Set to false if your test relies on
 * correct overlay stacking (like in case of modal.ts, drag-and-drop.ts, sidebar.ts, ui.ts). Default: true.
 */
hardwareAcceleration?: boolean
```

The deletion left no comment behind, so the helper now reads as a curated list with no record of what is deliberately missing from it.

## Symptoms

- An overlay — modal, popover, sidebar — sits behind the content it should cover, in the snapshot only; the app itself is fine under the same steps.
- Drop targets rendered by `em.testFlags.simulateDrop` (see [`simulateDragAndDrop`](../../../src/e2e/puppeteer/helpers/simulateDragAndDrop.ts)) stack against each other in an order the DOM does not explain.
- A new snapshot is green on one screenshot configuration and red on another, with nothing in the test to say which one is correct.

## What Didn't Work

- **Gaussian-blurring the compared images** to absorb platform differences. Deleted in c9f05a9bbc (#2430), which moved `threshold` 0.2 → 0.18 and `failureThreshold` 8 → 4 in the same change; that pull request also names what a tolerance loose enough to swallow rendering noise costs — it "fails to differentiate between different drop targets rendered by `em.testFlags.simulateDrop`."
- **Two parallel helpers**, `screenshot` and `screenshot-with-no-antialiasing`, introduced by #3164. Rejected in #3168: each name says what it does, neither says which one a given test needs, so every test author had to decide.
- **One helper behind a `hardwareAcceleration?: boolean` flag** (#3830). Rejected in review for the same reason one level down — the correct value was an unguessable per-file list, so the choice had merely moved into a parameter. From the review: there is "still a bit of the core problem left in that the developer needs to somehow know whether to disable hardware acceleration or not."

## Solution

One screenshot path with no antialiasing knob. Twelve test files import [`screenshot`](../../../src/e2e/puppeteer/helpers/screenshot.ts) — `ColorPicker.ts`, `Divider.ts`, `categorize.ts`, `drag-and-drop.ts`, `gesture-diagram.ts`, `modal.ts`, `render-thoughts.ts`, `sidebar.ts`, `table-view.ts`, `thought-wrap.ts`, `ui.ts`, `url.ts` — and no test calls `page.screenshot` directly. (`__image_snapshots__/` holds 14 subdirectories, including `desktopCommandUniverse/` and `ubuntu/`, so it is not a 1:1 mapping.) The helper takes `page` from [`session.ts`](../../../src/e2e/puppeteer/session.ts) and is the sanctioned Arrange-phase style mutation for snapshots — see the *Visual snapshot stabilization* row under [Sanctioned Backdoors](../../testing.md#sanctioned-backdoors), and [Visual snapshot tests](../../testing.md#visual-snapshot-tests) for the diff workflow and the targeted update command.

`getAntialiasingCSS` switches off font smoothing, ligatures and kerning, animations and transitions, and pins `text-rendering: geometricPrecision` and `image-rendering: pixelated`, everything `!important`. The one compositing property it keeps is `backface-visibility: hidden`, which survived #3854 where `perspective: 1000px` did not, because `backface-visibility` on its own creates no stacking context. That is the line the rule is drawn on, not "layer promotion" as a category.

## Why This Works

`z-index` ranks only against siblings inside the same stacking context — the mechanism [a blur, a blend, or a z-index silently does nothing](../styling/compositing-traps-blur-blend-stacking.md) covers for production styles. A universal `perspective` gives every element a context of its own, so a value that used to compete against a distant ancestor's now competes against its own parent's children and loses: the modal paints under the page rather than over it. `perspective` also makes every element a containing block for fixed and absolutely positioned descendants, which is the second half of why overlays land in the wrong place. Neither effect is visible in an ordinary run, because the stylesheet exists only for the duration of one `page.screenshot` call — which is precisely why the failure arrives as an unexplained snapshot diff.

The tolerances leave no headroom to hide this in: [`configureSnapshots.ts`](../../../src/e2e/puppeteer/configureSnapshots.ts) pairs a deliberately loose per-pixel `threshold: 0.18` (its comment notes bullet SVGs fail even at 0.1) with a whole-image `failureThreshold: 4`, and the 4 is not to be raised to absorb a flake.

## Prevention

- `rg -n 'page\.screenshot' src/e2e` must return exactly one hit, inside `screenshot.ts`. A second hit is a snapshot taken outside the stylesheet.
- `rg -n 'perspective|will-change|translateZ' src/e2e/puppeteer/helpers/screenshot.ts` must return nothing. Before adding any property to `getAntialiasingCSS`, ask whether it creates a stacking context or a containing block; if it does, it is rejected regardless of what it does to text.
- A snapshot that only passes with a different screenshot configuration is a signal to fix the stylesheet or the test, never to reintroduce the choice. This is [Principle 3](../../testing.md#3-never-wait-for-wall-clock-time-wait-for-the-response) applied to CSS rather than timing: find the controlling condition instead of adding a knob that absorbs it.
- Validate any change to the stylesheet against the four suites that were the canaries, not against the text-heavy ones it is aimed at: `yarn test:puppeteer modal`, `drag-and-drop`, `sidebar`, `ui`. A returning flake is filed through [automated flaky-test detection](../../testing.md#automated-flaky-test-detection).
- A one-line comment in `getAntialiasingCSS` pointing here would put the constraint back where it is edited.

## Related

- #3164 — introduced the antialiasing stylesheet, with `perspective`.
- #3168 — one snapshot function, and the stacking context that blocked it.
- #3830 — the `hardwareAcceleration` flag, merged and then rejected in review.
- #3847 — unify the option: always antialiased or never.
- #3854 — `perspective` deleted, 69 snapshots regenerated.
- #2430 — blur removed, `failureThreshold` 8 → 4.
- [When a blur, a blend, or a z-index silently does nothing](../styling/compositing-traps-blur-blend-stacking.md) — the same mechanism in production styles.
- [testing.md → Visual snapshot tests](../../testing.md#visual-snapshot-tests) — what snapshot tests cover and how to update one.
- [testing.md → Sanctioned Backdoors](../../testing.md#sanctioned-backdoors) — the constraint on Arrange-phase style mutation.
- [testing.md → CI workflows](../../testing.md#ci-workflows) — where the `__diff_output__` artifact and the Puppeteer Diff Comment appear.
