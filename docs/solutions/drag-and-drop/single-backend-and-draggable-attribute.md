---
title: Registering a second react-dnd backend strips the draggable attribute iOS Safari needs
date: 2026-09-17
category: drag-and-drop
module: drag_and_drop
problem_type: architecture_pattern
component: frontend
severity: medium
applies_when:
  - Adding, layering, or reintroducing a second react-dnd backend
  - Reaching for react-dnd-multi-backend to support mouse and touch at once
  - Touching the draggable attribute on a thought
  - Upgrading react-dnd-html5-backend past 16.0.1
  - iOS Safari's native long-press UI reappears on a thought
tags:
  - drag-and-drop
  - react-dnd
  - ios-safari
  - long-press
  - backend
  - yarn-patch
---

# Registering a second react-dnd backend strips the draggable attribute iOS Safari needs

## Context

[`StaticThought`](../../../src/components/StaticThought.tsx) sets `draggable={!!longPressProps && isSafari()}` on its `aria-label='thought'` div, and [`DragAndDropContext`](../../../src/components/DragAndDropContext.tsx) resolves `backend={isTouch ? TouchBackend : HTML5Backend}`. One expression per file, a component tree apart, and a single mechanism: the attribute only survives on device because exactly one backend is ever registered.

The comment directly above the attribute already carries why it is there — iOS Safari's native long press, the issue trail, the inverted Android polarity — plus one claim that misleads on its own: `HTML5Backend will override this to be "true" on platforms that use it`. That is the benign direction. The override that costs you is the other one, and it runs on teardown.

`longPressProps` is the touch gate. [`Thought`](../../../src/components/Thought.tsx) passes `isTouch && !hasSelectionRange ? dragHoldResult.props : undefined`, so the attribute is present exactly when a long press is armed on iOS Safari: touch, with no active text selection. That predicate reached its current form after the original fix, in bd6f5deb82 (#3611) and d63a25d8b5 (#3706). The same div also takes a drag-source connector on touch — `dragSourceEditable`, one of the two sources split apart by #3355, see [the bullet/editable drag-source split](two-drag-sources-bullet-and-editable.md) — which is what puts the node within a backend's reach at all.

## Guidance

**Exactly one react-dnd backend may ever be registered.** [Backend selection](../../drag-and-drop.md#backend-selection) gives the platform table and the shared options; what it does not say is that the exclusivity is load-bearing rather than tidy.

`HTML5BackendImpl`'s `connectDragSource` calls `node.setAttribute('draggable', 'true')` on connect and returns a disconnect closure that calls `node.setAttribute('draggable', 'false')`. It never reads the prior value and never restores it, so a node that arrived with the attribute already set leaves teardown with it cleared. That is react-dnd-html5-backend 16.0.1 as **em** consumes it, through the yarn patch resolved in [`package.json`](../../../package.json); the patch removes a single `e.preventDefault()` from the native drop handler (see [react-dnd patches](../../drag-and-drop.md#react-dnd-patches)) and leaves the `setAttribute` pair untouched, so a reader checking `node_modules` is reading patched output and still seeing the trap. Re-read those two lines before any upgrade past 16.0.1.

Register both backends and that teardown runs anyway. #3023 put it down to HTML5Backend de-registering as TouchBackend takes over; what was measured is narrower and enough — with the second backend registered the attribute is `false` in the DOM whatever React rendered, and without it the attribute survives on device. The JSX is therefore not evidence. Read it from the DOM during an actual long press, `document.querySelector('[aria-label=thought]').getAttribute('draggable')`, rather than from the render.

## Why This Matters

Neither half of the fix does anything alone, which is what keeps the coupling invisible. #3023's review put the question directly — whether the `draggable` attribute and the removal of `react-dnd-multi-backend` were each required — and the answer was that `draggable` does fix the problem, but only where HTML5Backend is not there to remove it. Add the attribute and keep the second backend and nothing changes on iOS; drop the second backend without the attribute and nothing changes either.

Nothing in the working tree records that `react-dnd-multi-backend` was ever a dependency — de6ee0e03b (#3023) took it out of `package.json` and `yarn.lock`, and with it a `DndProvider` that registered `HTML5Backend` under `PointerTransition` and `TouchBackend` under `TouchTransition` on every platform — so the single-backend line reads today like a simplification rather than a fix. It has since survived one rework of the drag manager, 7066b4e173 (#3119), which added `touchSlop` to the `options` object and left the backend expression alone.

Simultaneous mouse-and-touch devices, the touchscreen laptops raised in LouisBrunner/dnd-multi-backend#9, were ruled out on the record rather than overlooked: [`isTouch`](../../../src/browser.ts) is one module-level const evaluated once per session and read in over a hundred files, and nobody had established that the multi-backend configuration supported those devices either. A scope decision, not a bug waiting to be found.

## When to Apply

- Before registering any backend beyond the one `DragAndDropContext` selects, including a pipeline that promises to swap between them.
- When native iOS Safari long-press UI — the callout, the magnifier, text highlighting — returns to a thought. The attribute may still be in the JSX and absent from the DOM.
- Not to be confused with the other iOS lever: [`selectionRangeStore`](../../cursor-and-caret.md#selectionrangestore) turns `canDrag` off while a text range is selected. That one decides whether a drag may start; this one decides whether Safari shows its own gesture UI at all.

## Examples

| Attempt in #3023 | Outcome |
| --- | --- |
| `draggable` in JSX, `react-dnd-multi-backend` left in place | No effect on device at all; the attribute is cleared on backend handover. |
| Re-adding `draggable` from an effect once both backends have registered | Worked; rejected as messier than not registering the second backend. |
| Keeping multi-backend but listing `TouchBackend` first (d255ac41ef) | Broke four desktop Puppeteer snapshots. |
| Accepting the pixel shift and re-recording those snapshots | Considered; dropping to one backend made them pass unchanged, so nothing was re-recorded. |
| HTML5Backend instead of TouchBackend on iOS Safari (#3011) | Closed unmerged. |

The snapshot failures are why multi-backend went away rather than the ordering being kept. Registering `TouchBackend` on desktop at all shifted the final, collapsed thought by one pixel in four [visual tests](../../testing.md#visual-snapshot-tests) locally — two of them in CI, the other two already skipped under `testIfNotCI` — on a path with nothing to do with touch: "I verified that simply commenting out `TouchBackend` from `DragAndDropContext` fixes the test." Neither `TouchBackendImpl` nor `MultiBackendImpl` writes attributes, and the cause was never found.

That quote also names `Editable` as the attribute's home, which it was at the time; it now lives on `StaticThought`'s `aria-label='thought'` div. Read the location as history.

## Related

- #3023, #2953, #2931, #2964, #2949, #3011
- [Backend selection](../../drag-and-drop.md#backend-selection) and [react-dnd patches](../../drag-and-drop.md#react-dnd-patches)
- [`selectionRangeStore`](../../cursor-and-caret.md#selectionrangestore)
- [The bullet and the editable need two separate `useDrag` hooks](two-drag-sources-bullet-and-editable.md)
