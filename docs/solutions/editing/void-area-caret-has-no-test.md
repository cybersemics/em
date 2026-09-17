---
title: Void-area caret tests pass whether or not the bug is present
date: 2026-09-17
category: editing
module: caret
problem_type: workflow_issue
component: frontend
severity: high
applies_when:
  - Changing getCaretOffset or any of its helpers
  - Changing the inVoidArea branch in useEditMode's onMouseDown
  - Changing the editable's padding, line-height, or vertical spacing
  - Reviewing a caret change whose only evidence is a green CI run
tags: [ios-safari, caret, getcaretoffset, manual-testing, hit-testing, test-coverage]
---

# Void-area caret tests pass whether or not the bug is present

## Context

iOS Safari resolves a tap to a caret position by hit-testing glyph boxes, so a tap in the editable's padding, in the leading that `line-height` adds above and below the glyphs, or past the last character on a line has no glyph under it and snaps the caret to the beginning or end of the whole text node. [`getCaretOffset`](../../../src/device/getCaretOffset.ts) computes the offset the tap should have produced and flags whether the point was in a void area; [`useEditMode`](../../../src/components/Editable/useEditMode.ts)'s `onMouseDown` applies that offset and calls `preventDefault` only when `inVoidArea` is true. Why that branch lives on `mousedown` is [Never consolidate Editable's tap handlers onto mousedown](./tap-handler-event-ownership.md); the tap pipeline around it is [Cursor and Caret § Mobile](../../cursor-and-caret.md#mobile).

Three runners reach that code and none runs on a browser that hit-tests glyphs only — the shape [Cursor and Caret § Testing](../../cursor-and-caret.md#testing) already names for the touch selection that outlives a blur. #3374 says as much in its own Testing section: it requires WebdriverIO tests for iOS, and they were never written.

## Guidance

Treat a change to [`getCaretOffset.ts`](../../../src/device/getCaretOffset.ts) or to the `inVoidArea` branch as unverified until it has been driven by hand on a real iOS device against the [24-case checklist](https://github.com/cybersemics/em/issues/3374#issuecomment-3807358521) in #3374. A green CI run is not evidence about this code.

| Runner | What it reaches, and what it cannot fail on |
| --- | --- |
| Puppeteer | Chromium runs the same `onMouseDown` branch, so the horizontal math is covered: [`caret.ts`](../../../src/e2e/puppeteer/__tests__/caret.ts) asserts the offset after a left-edge, right-edge and mid-word click and after a click at the end of a soft-wrapped line (#4426), and [`editable-gap.ts`](../../../src/e2e/puppeteer/__tests__/editable-gap.ts) clicks the band between two thoughts and asserts the caret lands at neither offset 0 nor the end. What Chromium cannot do is fail: it hit-tests that band correctly unaided. `snapToWordBoundary` is unreachable there, gated on `isSafari() && isTouch`, and [`isSafari`](../../../src/browser.ts) tests `navigator.vendor` for `Apple`. |
| jsdom | `getTextNodeLines` derives lines from per-character rects, and [`setupTests.ts`](../../../src/setupTests.ts) stubs `Range.prototype.getClientRects` to an empty list, so the line array is empty, `getCaretOffset` returns `{ offset: null }`, and `onMouseDown` falls through to the browser's own placement. Dereferencing that empty result threw instead, silently, for the three months between #3410 and #5012 — [Testing § Vitest configuration](../../testing.md#vitest-configuration) has the masking mechanism. |
| WebdriverIO on iOS | [`src/e2e/iOS/__tests__/caret.ts`](../../../src/e2e/iOS/__tests__/caret.ts) is the only suite on the affected platform, and it asserts which thought holds the selection rather than where in it — one `focusOffset` assertion in the file, in the space-bar trackpad case (#3276). Its taps land on thought centres, or four pixels past the right edge of the text for #4394. |

## Why This Matters

The failure mode is silent and wide. A change to `snapToWordBoundary`, or to the greedy line-splitting tolerance in `getTextNodeLines` and the `lineStart`/`lineEnd` search range that compensates for it, can pass every suite and still regress emoji, italics, punctuation, hyphenated wraps, double-tap word selection, the iOS context menu on an empty thought, and selection dragging. Each of those broke separately during #3410, one per round of manual testing, which is why the issue carries a matrix rather than a reproduction. Three of the 24 cases are still unchecked.

The checklist is load-bearing and unreferenced: nothing in the tree points at it. [Testing § Manual Test Cases → Touch Events](../../testing.md#touch-events) already lists cases of exactly this kind, so moving it there is a [`docs-sync`](../../../.github/skills/docs-sync/SKILL.md) job rather than this file's content.

## When to Apply

- Touching [`getCaretOffset.ts`](../../../src/device/getCaretOffset.ts), including a refactor that looks behaviour-preserving.
- Touching the `inVoidArea` → `preventDefault` branch in [`useEditMode.ts`](../../../src/components/Editable/useEditMode.ts). The comment beside it says why preventing a tap the browser can handle natively is harmful; it does not say that no test will catch you.
- Changing the editable's vertical metrics — padding, line height, or the spacing between thoughts. The void area is a function of those, so a spacing change moves it.

## Examples

**Clipping the box.** 1550e4f5cc (2022) added `clip-path: inset(0.001px 0 0.1em 0)` to the editable to trim its top and bottom edges, plus an overlap so the clip left no visible gap between thoughts; the pairing later became the `editableClipBottom` token and a `fontSize / 8` reduction of every measured height in [`useSizeTracking`](../../../src/hooks/useSizeTracking.ts). Its comment named the target as the top and bottom 1px. That is not what the void area is: it is the whole band of leading `line-height` adds above and below the glyphs, plus the editable's padding, and clipping a box does not move a glyph. The pair came out in two commits — f00598db0a (#3410) dropped the `clipPath` from [`src/recipes/editable.ts`](../../../src/recipes/editable.ts) and the token from [`panda.config.ts`](../../../panda.config.ts), and b94188be45 (#4440) dropped the height reduction. Scope the claim to the editable recipe: [`ThoughtAnnotationWrapper`](../../../src/components/ThoughtAnnotationWrapper.tsx) still carries a `clipPath` for an unrelated purpose. [Layout and Rendering § `useSizeTracking` and the `sizes` map](../../layout-rendering.md#usesizetracking-and-the-sizes-map) still presents the pair as current, so a reader following the docs today reaches for the approach that was disproven — a `docs-sync` item, not a correction to make here.

**Suppressing the tap and stopping.** An iteration of #3410 detected the void-area tap and called `preventDefault` without then placing the caret itself. That removes the wrong placement without supplying a right one, so the band between two thoughts becomes a dead zone where a tap does nothing at all. It came back as a review rejection, and "no dead zone between the thoughts" is half of the expected behaviour #3374 asks for — the other half being that the caret land in the middle of the tapped thought rather than at either edge.

## Related

- #3374 — the issue, and the manual matrix that is the only regression suite for this behaviour.
- #3410 — the JS replacement, and every case the matrix accumulated while it was in review.
- #5012 — the jsdom crash the empty line array caused, masked for months.
- #4440 — the second half of the clip-path removal.
- [Cursor and Caret § Mobile](../../cursor-and-caret.md#mobile) — the tap pipeline the `inVoidArea` branch sits inside.
- [Testing § WebdriverIO tests](../../testing.md#5-webdriverio-tests) — how to run the iOS suite the manual cases should eventually become.
