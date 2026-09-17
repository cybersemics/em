---
title: The hover guards are what stop the shake detector cancelling drags
date: 2026-09-17
category: drag-and-drop
module: drag_and_drop
problem_type: architecture_pattern
component: frontend
severity: high
applies_when:
  - Editing the hover handler in either useDragAndDropThought or useDragAndDropSubThought
  - Removing or relaxing throttleByMousePosition as a performance optimisation
  - Rebuilding or replacing the shake detector
  - A drag cancels itself while the pointer is moving slowly or not at all
tags:
  - drag-and-drop
  - react-dnd
  - shaker
  - hover
  - throttling
  - long-press
---

# The hover guards are what stop the shake detector cancelling drags

## Context

[`throttleByMousePosition`](../../../src/util/throttleByMousePosition.ts) and the `hoveringPath` / `hoverZone` equality check inside the `hover` handlers read as performance work. [Performance considerations](../../drag-and-drop.md#performance-considerations) files the first one that way and the second is documented nowhere. Both are correctness guards: every `longPress` dispatch carrying `DragInProgress` re-arms [`shaker`](../../../src/util/shaker.ts), and six dispatches naming the same thought cancel the drag.

`shaker` is the only path into `DragCanceled` ([state machine](../../drag-and-drop.md#state-machine-statelongpress)) — it holds the only `longPress({ value: DragCanceled })` in the tree. It is armed from inside `longPressActionCreator` in [`longPress.ts`](../../../src/actions/longPress.ts), which calls `shaker(dispatch, hoveringPath ? head(hoveringPath) : undefined)` under `if (value === LongPressState.DragInProgress)`. A null `hoveringPath` counts no id and only restarts the debounce, so the counter is driven purely by hover dispatches that carry a target.

Its JSDoc and the inline comment above `SHAKE_THRESHOLD` — the one that spells the constant `BEBOUNCE_SHAKING` — both describe a count of *unique* ids. The implementation counts repeats of one id: `repeatedIds` maps an id to its count, `repeatedMax` is the running maximum, and the drag is cancelled when `repeatedMax` reaches 6. `DEBOUNCE_SHAKING` is a lodash debounce on the reset rather than a fixed window, so the counts survive for as long as hits keep arriving less than 100 ms apart. The detector therefore fires when a single drop target is named six times in quick succession — a pointer lingering and jittering at a boundary, which is the opposite of a shake. Nothing in the drag path measures pointer velocity or direction.

That is the whole of #3273: dragging a thought in slow circles over its siblings cancelled the drag with no rapid movement at all.

## Guidance

The `hover` handler in [`useDragAndDropThought`](../../drag-and-drop.md#usedraganddropthought) is what keeps the detector quiet. Three gates stand between a `drag` event and the shaker:

| Gate | Why it is load-bearing |
| --- | --- |
| `throttleByMousePosition(cb, monitor.getClientOffset())` | During an HTML5 drag the browser dispatches no `mousemove` at all, while `drag` fires continuously at an unchanged position. react-dnd's `hover` rides on `drag`, so a perfectly stationary pointer still produces a steady stream of hover callbacks. `lastMouseDownPosition` is module-level, which makes this one gate for the whole tree: at most one hover body runs per distinct client offset. |
| `if (!monitor.isOver({ shallow: true })) return` | Keeps an ancestor target from claiming a hover that belongs to a nested one. |
| `state.hoveringPath === props.path && state.hoverZone === props.hoverZone` | Movement inside a single target produces a new coordinate on every `drag`, so the throttle passes and react-dnd re-fires `hover` on the same target. Without this clause one target names itself repeatedly and reaches the threshold on its own. |

A fourth clause rides in the same early return and does a different job. `state.longPress === LongPressState.DragCanceled` does not make `DragCanceled` terminal — the reducer already refuses `DragCanceled → DragInProgress` and falls through to `console.error('Invalid longPress transition: …')`. The clause is what stops the handler from producing those rejected dispatches at all, which is what #3272 added for #3270.

The two hooks are not identical. [`useDragAndDropSubThought`](../../../src/hooks/useDragAndDropSubThought.tsx) has the same wrapper and the same early return, with `DropThoughtZone.SubthoughtsDrop` hardcoded in place of `props.hoverZone`, but no shallow-hover bail: it was dropped during #3275 because it made a drag-and-drop e2e test fail, on the reasoning that [`DropChild`](../../../src/components/DropChild.tsx) renders only on collapsed thoughts and [`DropCliff`](../../../src/components/DropCliff.tsx) only at cliffs, so neither ever has a visible child to shadow it. Those two hooks are the only importers of `throttleByMousePosition` in `src/`, so any change to the guards or to the shaker has to land in both.

The coupling is loose in one place: the guard keys on `(path, hoverZone)` while the shaker counts `head(path)` alone and ignores the zone, so dispatches that differ only by hover zone on the same thought pass the guard and still accumulate as repeats of one id. That is the first thing to check if #3273 recurs.

When the shaker is rebuilt (#3423), key it off pointer direction or velocity rather than dispatch frequency — the direction settled on in the #3273 thread, and the one that would also let a shake register over the empty space below the thoughtspace, where there is no drop target to name. The repeat-count trap dies with the current implementation; the hover guards must stay regardless, because they are also what holds the [`expandHoverDown`](../../../src/actions/expandHoverDown.ts) ping-pong of #3278 down.

## Why This Matters

A guard labelled as an optimisation is a guard someone will relax for a good-looking reason. `throttleByMousePosition`'s own comment cites #3278 and says only "short-circuit until the pointer position changes" — no mention of drag cancellation. Nothing connects either guard to `shaker`, `shaker` appears in no doc, and `DragCanceled` is described as *e.g. user shake gesture*, which points a reader at pointer speed. Delete a guard on performance grounds and the failure that comes back is a drag that aborts under slow movement, several files away from the edit.

The `-webkit-text-stroke-width` comment in [`Thought`](../../../src/components/Thought.tsx) records the far end of the same loop — bolding a dragged thought with `font-weight` changes its width, which can wrap it, which changes its height, which triggers a different `hoveringPath` ad infinitum and a Shaker false positive. It names one source of the oscillation without saying that the hover guards are what suppress the rest.

## When to Apply

Treat a change to either `hover` handler as a change to drag cancellation, not to frame cost.

Nothing catches a regression automatically. The only test of the action creator, [`longPress.ts`](../../../src/actions/__tests__/longPress.ts), covers the keyboard blur of #4683 and never touches the shaker; the e2e suite in [`drag-and-drop.ts`](../../../src/e2e/puppeteer/__tests__/drag-and-drop.ts) drives every drag through [`dragAndDropThought`](../../../src/e2e/puppeteer/helpers/dragAndDropThought.ts), which jumps the pointer to the drop target in one or two `page.mouse.move` calls, so no target is ever named twice. A regression appears as a drag that cancels itself under manual dragging.

A characterization test pins what the detector actually does: dispatch `longPress({ value: DragInProgress, hoveringPath })` six times for one path with no 100 ms gap and assert `state.longPress` is `DragCanceled`, then do the same with six *different* paths and assert it is still `DragInProgress` — the case the JSDoc claims is the trigger. It does not cover the guards, which sit above the action creator, but it stops a rebuild from quietly keeping the repeat count.

Fix the `shaker` comments in the same change as any edit to that file — a reader who trusts "unique ids" will reason about the guards backwards.

## Examples

The re-dispatch in [`useDragAndDropThought.tsx`](../../../src/hooks/useDragAndDropThought.tsx) only happens on the far side of every clause:

```ts
hover: (_, monitor) =>
  throttleByMousePosition(() => {
    // is being hovered over current thought irrespective of whether the given item is
    if (!monitor.isOver({ shallow: true })) return

    dispatch((dispatch, getState) => {
      const state = getState()

      // If the drag has been canceled, ignore hoveringPath behavior
      if (
        state.longPress === LongPressState.DragCanceled ||
        (state.hoveringPath === props.path && state.hoverZone === props.hoverZone)
      )
        return

      dispatch(longPress({ value: state.longPress, /* … */ hoveringPath: props.path }))
    })
  }, monitor.getClientOffset()),
```

Approaches tried on the way here and abandoned, from the #3275 thread:

- **Positional slop in the hover comparison**, to absorb `drag` events whose coordinate lags the pointer's resting position. It became a balancing act: widen the slop and real movement stopped registering as a new hover (a dead zone), narrow it and the false positives came back. It never fixed the #3278 ping-pong completely, which is what took it off the table — the requirement was that the hover path not alternate when there is no movement, and "usually" did not satisfy it.
- **Re-enabling `hoveringPath` updates only on the next `drag` event.** Proposed in review as the simpler, stateless version. `drag` fires continuously once a drag begins and triggers `hover` each time, so the gate never closed; the event stream carries no signal that the pointer moved, only that a drag is live. Comparing the coordinate it carries is what `throttleByMousePosition` ended up doing instead.
- **Capturing the mouse position at the moment `expandHoverDown` actually fires**, rather than when `longPress` is dispatched. More accurate, but it requires keeping the saved position updated while the debounce timer runs and writing the final one back from inside the timeout. Rejected on complexity for an edge case that already carried slop, timing, and state.

## Related

- #3270 — the invalid `DragCanceled` → `DragInProgress` transition.
- #3272 — the short-circuit that stopped the hover path updating after a cancel.
- #3273 — the report: slow circles cancel the drag. Retested on main after #3275 and closed, with the drag then, if anything, too hard to cancel.
- #3274 — replacing `useHoveringPath` with `hover`, which made it fire constantly and made #3273 much worse first.
- #3275 — the merged fix that introduced both guards.
- #3278 — the ping-pong the same guards hold down.
- #3423 — rebuild the shaker. Open.
- [drag-and-drop.md → State machine](../../drag-and-drop.md#state-machine-statelongpress) — `LongPressState` and its transitions.
- [drag-and-drop.md → `useDragAndDropThought`](../../drag-and-drop.md#usedraganddropthought) — where the `hover` handler sits among the hook's other callbacks.
- [drag-and-drop.md → Performance considerations](../../drag-and-drop.md#performance-considerations) — the bullet this file amends.
- [glossary.md](../../glossary.md) — `DragCanceled / DragHold / DragInProgress / Inactive`, `LongPressState`.
