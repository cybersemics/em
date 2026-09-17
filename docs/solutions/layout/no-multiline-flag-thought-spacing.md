---
title: "Thought spacing is padding-based: never reintroduce a multiline flag"
date: 2026-09-17
category: layout
module: layout_rendering
problem_type: architecture_pattern
component: frontend
severity: high
applies_when:
  - Adding a style that needs to differ between single-line and multiline thoughts
  - Changing editablePaddingTop or editablePaddingBottom, or overriding an editable's padding from JS
  - Changing how a thought's height is measured, or what triggers a re-measure
  - Chasing spacing that drifts down the page on Safari or iOS
  - Adjusting bullet-vs-text vertical centering
tags:
  - layout
  - spacing
  - line-height
  - safari
  - bullet-alignment
  - measurement
---

# Thought spacing is padding-based: never reintroduce a multiline flag

## Context

A reactive `multiline` flag is out of bounds in **em**. Detecting that a thought wraps is trivial — measure its height against a single line. Knowing *when* to measure is not, and that is the part that never worked. `ResizeObserver` was rejected on performance grounds (see [Layout is measured from enumerated dependencies, never a `ResizeObserver`](no-resize-observers-for-layout.md)), so every trigger had to be enumerated by hand in `useMultiline`: mount, edit, split, viewport resize, font size, cursor move, `=style` load. Each one that was missed became a bug — #2136 after split, #2501 after join, #2794 when `=style` finished loading, #3096 after cursor up, #2778 alternating during typing on Safari, #3279 a wrong line-height on first paint — six between July 2024 and October 2025 alone, against a hook that had been in the tree since 2022. #3589 measured `updateMultiline` as one of the two most expensive per-thought callbacks in the app.

Every thought now uses one line-height — `lineHeight: 1.25` on `body, textarea` in [`panda.config.ts`](../../../panda.config.ts) — and the spacing that the larger single-line line-height used to supply comes from two spacing tokens, `editablePaddingTop` (`0.375em`) and `editablePaddingBottom` (`0.25em`), consumed by [`editableRecipe`](../../../src/recipes/editable.ts), [`BulletPositioner`](../../../src/components/BulletPositioner.tsx) and [`dropEndRecipe`](../../../src/recipes/dropEnd.ts). The extra breathing room below a multiline thought is not CSS at all: it falls out of the `yaccum` walk in [`usePositionedThoughts`](../../layout-rendering.md#usepositionedthoughts-x-and-y), because a taller measured height advances the next thought further.

What unblocked this was #3410, which #3598 lists as its one dependency. Line-height had been mandatory rather than merely conventional: tapping the extra leading above or below the text had to place the caret at the right character offset, and only line-height gave the browser a box to hit. The old editable recipe said so where the padding would have gone — "Cannot use padding-top on editable, as clicking it causes the selection to go to the beginning". #3410 intercepted the tap instead and resolved the offset from per-character `Range` rects in [`getCaretOffset`](../../../src/device/getCaretOffset.ts) — see [Caret / Browser Selection](../../cursor-and-caret.md#caret--browser-selection) and [`useEditMode`](../../cursor-and-caret.md#useeditmode). With the caret no longer depending on it, #2551's 2024 conclusion ("it is not possible to unify") stopped holding, and #3598 reopened the removal.

## Guidance

**Do not add a flag, a prop, or a hook that reacts to a thought becoming multiline.** The re-measure trigger list in [`VirtualThought`](../../layout-rendering.md#virtualthought--when-does-it-re-measure) is the fragile part of the layout pipeline, and it is fragile for exactly this reason. A second consumer of the same measurement doubles the surface on which a missed trigger is a visible bug. Height measurement has to live there because the two-pass render cannot proceed without it; a style variant does not.

**Padding is load-bearing for layout now, in a way it was not when line-height carried the spacing.** Any code that overwrites an editable's padding must read the computed padding first and add it back. [`preventAutoscroll`](../../../src/device/preventAutoscroll.ts) is the pattern to copy: it reads `parseFloat(getComputedStyle(el).paddingTop)` and adds it back into the inflated `paddingTop` it writes, and it takes every style read before any style write, because interleaving them forces repeated layout. It also publishes `getAutoscrollPadding`, which [`VirtualThought`](../../../src/components/VirtualThought.tsx)'s `updateSize` subtracts so a height measured during the autoscroll window is still the thought's true height. Skipping the read-back is what #4440 fixed, and it is the failure that reverted the whole removal for five days.

**Measure with `getBoundingClientRect().height`, never `offsetHeight`.** Safari *floors* a fractional computed line-height: at 18px, `18 × 1.25 = 22.5` renders as 21.99. `lineHeight: 2` always produced an integer, so this never mattered before. It matters now: `offsetHeight` discards the fraction on every thought, and `yaccum` adds those discarded fractions up. Switching the measurement was also what recovered a single-line cliff thought's true 40.5px. `updateSize` uses `getBoundingClientRect().height` unconditionally today.

**Bullet-vs-text vertical centering is per-platform, and the old line-height was setting it implicitly.** Removing it exposed the divergence: during review of #4253 the bullet rode visibly too high on desktop Chrome on Mac and dramatically too high on an iPhone 14PM, while Android Chrome was separately out of place because of a `marginTop` override in the old editable recipe. The one platform-specific bullet adjustment in the tree — `glyphBottomMargin = isIOSSafari ? '-0.2em' : '-0.3em'` in [`BulletPositioner`](../../../src/components/BulletPositioner.tsx), where `isIOSSafari` is `isTouch && isiPhone && isSafari()` — predates this work by seven months and is not what resolved it. Its comment says what it does and not why the platforms differ.

**Tie the bullet's click area to the tokens, not to copies of their values.** `BulletPositioner` composes its `paddingTop`/`paddingBottom` from `token('spacing.editablePaddingTop')` and `token('spacing.editablePaddingBottom')` plus `extendClickHeight`, and cancels only the click-area term with a negative `top`/`left`, so enlarging the hit area does not move the glyph while the token term still carries it down to the first line of text. Hardcoding `0.375em` there would give the false impression that the bullet and the editable are independently positioned.

**Three fossils read as live infrastructure and are not.** [`src/components/Editable/useMultiline.ts`](../../../src/components/Editable/useMultiline.ts) is still in the tree and has zero importers — `grep -rln useMultiline src/` returns only the file itself. Vestigial `multiline?: boolean` props survive on [`Editable`](../../../src/components/Editable.tsx), [`ThoughtAnnotation`](../../../src/components/ThoughtAnnotation.tsx) and [`ThoughtAnnotationWrapper`](../../../src/components/ThoughtAnnotationWrapper.tsx). `src/recipes/multiline.ts` is gone. All of these are removal candidates, not a half-finished wiring job waiting to be reconnected.

## Why This Matters

The standing acceptance bar, set in #3598 and applied through both landings: single-line and multiline spacing must match `main` across every font size and platform, and only 1–2px deviations that **do not accumulate down the page** are acceptable. That last clause is the whole test. A constant per-thought error is invisible; the same 0.5px compounding through `yaccum` is 10px — most of a line at 18px — by the twentieth thought. It is also why the `long list of siblings` case in [`render-thoughts.ts`](../../../src/e2e/puppeteer/__tests__/render-thoughts.ts) exists: twenty identical thoughts, run at three font sizes, added during #4253 precisely to cover the thought-to-bullet relationship as y accumulates. It catches accumulation rather than offset.

Sub-pixel arithmetic is the only thing standing between those two outcomes, which is why the measurement rules above are not style preferences:

| Font size | `1.25` line-height | Safari renders | Short by |
| --- | --- | --- | --- |
| 13px | 16.25 | 16 | 0.25 |
| 18px | 22.5 | 22 | 0.5 |
| 22px | 27.5 | 27 | 0.5 |

The error is stepped, not proportional, which is why no single padding constant corrects it.

One estimate has not caught up. `useSingleLineHeight` in [`LayoutTree`](../../../src/components/LayoutTree.tsx) still uses `fontSize * 2` — exact under `lineHeight: 2`, and now about 7% high, since a single-line thought is `1.25em` of line plus `0.625em` of padding. It serves twice over: as the first-pass estimate, which measurement then corrects, and as the centre of the window that decides which measured height counts as single-line. Only the second use could bite, and its tolerance is half the candidate height, far wider than 7%. See [`useSizeTracking` and the `sizes` map](../../layout-rendering.md#usesizetracking-and-the-sizes-map).

Two statements in [`layout-rendering.md`](../../layout-rendering.md) predate the removal and are now false: that `offsetHeight` is used on touch, and the `fontSize / 8` height clipping under `useSizeTracking`, whose `lineHeightOverlap` b94188be45 removed — [Void-area caret tests pass whether or not the bug is present](../editing/void-area-caret-has-no-test.md) traces that pair commit by commit. Both are [`docs-sync`](../../../.github/skills/docs-sync/SKILL.md) items; this file records the current behaviour, it does not correct the doc in place.

## When to Apply

Before landing anything that changes thought spacing:

- **Run the render-thoughts snapshots at every font size**, and read the diffs for *accumulation*, not for the first mismatched thought. A second thought that is consistently 1px off while the twentieth is not is acceptable; the reverse is not.
- **Verify on desktop Chrome on Mac, mobile Safari, iOS Capacitor and Android Chrome.** There is no automated coverage of mobile Safari, and this is exactly the class of change where Mac Chrome and Windows Chrome disagree — the too-high bullet in #4253 was invisible to the author on Windows and obvious to two reviewers on Mac and iPhone.
- **Check the bullet against the text, not against the thought box.** The review method: draw a horizontal line through the centre of the bullet and see where it falls on a glyph like `C`; it should land 1px below the vertical centre.
- **`grep` for anything that writes `padding` onto an editable** and confirm it reads the computed value first and batches its reads ahead of its writes.
- **If you are about to add a `multiline` prop, stop.** The gap it is meant to close is either a `yaccum` problem in `usePositionedThoughts` or a token value, and both are static.

## Examples

Approaches that were tried and failed, from #2501, #2551, #3598 and #4253:

| Tried | What happened |
| --- | --- |
| Keeping the flag and enumerating re-measure triggers by hand | Six bugs in fifteen months, each one a dependency nobody thought of. `useMultiline` ended with five separate subscriptions and still missed cases. |
| `ResizeObserver` | Rejected for performance before it was ever written, as it has been every other time the project reached for one — [Layout is measured from enumerated dependencies, never a `ResizeObserver`](no-resize-observers-for-layout.md). |
| `useLayoutEffect` → `useEffect` in `useMultiline` (#2501) | Fixes the stale measurement, and paints one frame at the wrong line-height. The hook had been moved *to* `useLayoutEffect` deliberately so the first paint was correct. The real cause was a `useCallback` closing over a stale `contentRef`. |
| A blanket `_safari: { paddingTop: 'calc(0.375em + 0.25px)' }` | Correct at 18px and 22px, 0.5px over at 13px, 0.25px under at 15px. The flooring error is stepped, so one constant cannot serve all font sizes. |
| `minHeight: '2em'` on the editable to re-create the old single-line box | Defeated by `boxSizing: border-box`; withdrawn in review. |
| `minHeight` + `display: flex` + `alignItems: center` on `StaticThought` | Closest approximation of the old line-height box for single-line thoughts, and does nothing for multiline ones. |
| Restoring the old line-height-based bullet position, and the `-0.5px` negative top margin from `main`'s editable recipe | Moved the bullet the wrong way on Mac, toward the iPhone failure rather than away from it. |
| #4253's first landing | Merged 2026-06-22, reverted wholesale the next day (668e5d04b3). Switching spacing from line-height to padding broke `preventAutoscroll`, which overwrote `paddingTop` without accounting for the editable's new top padding; the declarative `shouldSetSelection` path leaves it to the 10 ms fallback, which made the shift plainly visible. Re-landed with the compensation as #4440. |

## Related

- #3598, #4253, #4440, #3410, #2551, #2501, #3279, #4230
- [Layout is measured from enumerated dependencies, never a `ResizeObserver`](no-resize-observers-for-layout.md) — why `ResizeObserver` is not the way out of the trigger list.
- [Void-area caret tests pass whether or not the bug is present](../editing/void-area-caret-has-no-test.md) — the `clipPath` and `lineHeightOverlap` pair that came out alongside this work.
- [Layout Rendering → Two-pass render](../../layout-rendering.md#two-pass-render) — estimate, measure, reposition.
- [Layout Rendering → `VirtualThought` — when does it re-measure?](../../layout-rendering.md#virtualthought--when-does-it-re-measure) — the trigger list this file is about not duplicating.
- [Layout Rendering → `usePositionedThoughts` (x and y)](../../layout-rendering.md#usepositionedthoughts-x-and-y) — `yaccum`, where multiline spacing now comes from.
- [Layout Rendering → `useSizeTracking` and the `sizes` map](../../layout-rendering.md#usesizetracking-and-the-sizes-map) — `useSingleLineHeight` and the `fontSize * 2` estimate.
- [Cursor and Caret → Caret / Browser Selection](../../cursor-and-caret.md#caret--browser-selection) and [`useEditMode`](../../cursor-and-caret.md#useeditmode) — tap-to-caret, which is what made line-height removable.
- [Cursor and Caret → `preventAutoscroll.ts`](../../cursor-and-caret.md#preventautoscrollts) — the padding it inflates and `getAutoscrollPadding`.
