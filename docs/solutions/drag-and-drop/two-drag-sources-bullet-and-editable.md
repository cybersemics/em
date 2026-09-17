---
title: The bullet and the editable need two separate useDrag hooks
date: 2026-09-17
category: drag-and-drop
module: drag_and_drop
problem_type: architecture_pattern
component: frontend
severity: high
applies_when:
  - Refactoring useDragAndDropThought or deduplicating its two useDrag calls
  - Attaching a thought drag source to an additional DOM node
  - Changing the isTouch gate on the editable drag source or its long-press props
  - Upgrading react-dnd past 16.0.1
  - Making the thought container shrink to the width of its text
tags:
  - drag-and-drop
  - react-dnd
  - usedrag
  - bullet
  - editable
  - touch
---

# The bullet and the editable need two separate useDrag hooks

## Context

[`useDragAndDropThought`](../../../src/hooks/useDragAndDropThought.tsx) calls `useDrag` twice with byte-identical configuration — same `type: DragAndDropType.Thought`, same `item`, `canDrag`, `end` and `collect` — and returns both connectors as `dragSourceBullet` and `dragSourceEditable`. Collapsing them into one `useDrag` whose connector is attached to both nodes does not fail loudly. It leaves drag-and-drop half working: the first drag succeeds, then every drag started from the editable degrades into a `DragHold` that highlights the bullet, never escalates to `DragInProgress` and never cancels on move, while the bullet keeps dragging normally. That is what ethan-james reported in #3239 after passing a single `dragSource` into both `Bullet` and `StaticThought` as two refs.

The cause is react-dnd's, not React's. Each `useDrag` owns one `SourceConnector` holding one handler id. Calling its connector runs `clearDragSource()`, stores the new node, then `reconnectDragSource()`, which unsubscribes the previous `backend.connectDragSource(handlerId, node)` and registers the same id against the new node. Two nodes, one handler id, last caller wins — and the loser keeps the app's own long-press handlers with nothing behind them. That is react-dnd `^16.0.1` ([`package.json`](../../../package.json)); a major bump is a reason to re-test this, not a reason to assume it was fixed.

## Guidance

**Keep the two `useDrag` calls.** Two hooks sharing one `type` is the supported way to reach one drag item from two nodes.

**The two sources are not symmetric, and the asymmetry lives outside the hook.** A reader who opens only `useDragAndDropThought.tsx` sees two identical hooks and no platform distinction at all:

| Source | Passed from | Attached at | Gate |
| --- | --- | --- | --- |
| `dragSourceBullet` | [`Thought`](../../../src/components/Thought.tsx), unconditionally | [`BulletPositioner`](../../../src/components/BulletPositioner.tsx), via [`Bullet`](../../../src/components/Bullet.tsx) as a pass-through | none — every platform |
| `dragSourceEditable` | [`Thought`](../../../src/components/Thought.tsx) | [`StaticThought`](../../../src/components/StaticThought.tsx), on the `aria-label='thought'` div | `isTouch` |

Desktop is bullet-drag-only on purpose. Dragging text on desktop is for selecting text, and the editable source would steal it.

**The `isTouch` on the drag source and the `isTouch` on `longPressProps` move together.** `StaticThought` gates the editable `ref` on `isTouch`; `Thought` gates the long-press props it hands `StaticThought` on `isTouch && !hasSelectionRange`. Gating one without the other is the regression in #3571: 69e852b7d1 (#3355) put the `isTouch` on the `ref` and spread `{...longPressProps}` onto the same div unconditionally, so desktop kept `useLongPress`'s own timer on the editable and a click-and-hold on a thought's title entered `DragHold` where the browser's text-selection drag belonged. bd6f5deb82 (#3611) is two lines — the gate, and the prop turned optional. The other half of the conjunction arrived separately: `hasSelectionRange`, from [`selectionRangeStore`](../../../src/stores/selectionRangeStore.ts), keeps iOS's native selection controls working (d63a25d8b5, #3706), and is the only half the comment beside it documents.

**The comment next to the editable's `ref` is about a different gate.** `StaticThought` sets `draggable={!!longPressProps && isSafari()}` with a comment about iOS Safari's native long press (#2953, #2931, #2964). It says nothing about the `isTouch` on the very next line. Both gates sit on the same element and are unrelated.

**The drag source is the editable box, not the thought row.** The `aria-label='thought'` div is `display: inline-block` over a `MIN_CONTENT_WIDTH_EM` floor ([`thoughtRecipe`](../../../src/recipes/thought.ts)), so it stops where the text does, while the container around it is block-level and fills the row. Long-pressing the empty space to the right of a short thought is therefore a deliberate dead zone — no drag, no bullet highlight, no alert, no Command Center — which is what removed the scroll-zone false positives in #3239. Re-attaching a drag source or `longPressProps` to the container undoes that, and it fails as a UX regression rather than as a test.

[`dndRef`](../../../src/util/dndRef.ts) wraps both connectors at the attach sites. It is a React 19 ref-typing shim and has nothing to do with any of the above.

## Why This Matters

The failure mode has no error, no warning and no failing test. It is the drag state machine ([drag-and-drop.md → State machine](../../drag-and-drop.md#state-machine-statelongpress)) stalling at `DragHold` for one of two sources while the other still reaches `DragInProgress` — visible only by dragging a thought by its text three times in a row on a touch device, which is not something a reviewer does by default.

The reason recorded in [drag-and-drop.md → `useDragAndDropThought`](../../drag-and-drop.md#usedraganddropthought) — "the bullet and the editable text need separately-stable refs" — is a React ref-identity framing, and it is wrong. Stable refs are not the constraint; one connector per source id is. Left as written, it reads as an implementation detail that a tidy-up could remove; correcting it is [`docs-sync`](../../../.github/skills/docs-sync/SKILL.md)'s job.

## When to Apply

Before merging the two hooks, or attaching either connector to a second node, reproduce on touch: long-press the **text** of a thought, drag, drop, and repeat twice more without reloading. One successful drag proves nothing — the registration only goes wrong after the first connect. Then repeat from the bullet, and long-press the empty space right of a short thought and confirm nothing at all happens.

When touching the `isTouch` gates, change both or neither, and check desktop text selection (click-and-hold a title and drag) and mobile selection handles in the same pass.

When bumping react-dnd past 16.0.1, treat this file as the test plan rather than assuming the two hooks are still required — if one connector on two nodes works, the split can go, and the same touch reproduction proves it.

## Examples

Both hooks, in [`useDragAndDropThought`](../../../src/hooks/useDragAndDropThought.tsx):

```tsx
const [{ isDragging: isDraggingBullet }, dragSourceBullet, dragPreview] = useDrag({
  type: DragAndDropType.Thought,
  item: () => beginDrag(propsTypes),
  canDrag: () => canDrag(propsTypes),
  end: () => endDrag(),
  collect: dragCollect,
})

const [{ isDragging: isDraggingEditable }, dragSourceEditable] = useDrag({
  /* identical */
})
```

The gated attach, in [`StaticThought`](../../../src/components/StaticThought.tsx), directly below the `draggable` line and its unrelated comment:

```tsx
ref={isTouch ? dndRef(ref => dragSource(ref)) : undefined}
```

Already tried, from the #3239 thread — do not retry without new information:

- **One connector, two refs.** The half-broken state machine above. This is the route that produced the split.
- **Shrinking the thought container so a single block-level source matched the text width**, with `display: flex` or `display: inline-block` on the wrappers around [`StaticThought`](../../../src/components/StaticThought.tsx) (#3249, #3252, both abandoned). [`ThoughtAnnotation`](../../../src/components/ThoughtAnnotation.tsx) renders through [`ThoughtAnnotationWrapper`](../../../src/components/ThoughtAnnotationWrapper.tsx), which is `position: absolute` at `width: 100%` and so must wrap identically to the editable or the superscript stops lining up with the last line of wrapped text. (The `display: inline-block` in the base of [`thoughtRecipe`](../../../src/recipes/thought.ts) is older and unrelated; the failed experiments were on the outer wrappers.)
- **Hoisting `ThoughtAnnotation` out of `StaticThought` into `Thought`** so the annotation could keep `width: 100%` while the thought took a flexible width. Tried on a branch and reported in #3239: tests passed, but single-line thoughts stopped expanding under flexbox, and the widths and padding of ellipsized URLs could not be reconciled.

## Related

- #3239, #3249, #3252, #3355, #3571, #3611, #3706
- [Registering a second react-dnd backend strips the `draggable` attribute iOS Safari needs](single-backend-and-draggable-attribute.md) — the other gate on the same div, and how `longPressProps` reached its current predicate.
- [drag-and-drop.md → Drag sources](../../drag-and-drop.md#drag-sources) — the four sources and the `DragThoughtItem[]` shape.
- [drag-and-drop.md → `useDragAndDropThought`](../../drag-and-drop.md#usedraganddropthought) — what `canDrag`, `canDrop`, `drop`, `hover` and `endDrag` do.
- [drag-and-drop.md → State machine](../../drag-and-drop.md#state-machine-statelongpress) — `DragHold` and `DragInProgress`.
- [drag-and-drop.md → Backend selection](../../drag-and-drop.md#backend-selection) and [glossary → backend (drag)](../../glossary.md) — what `isTouch` selects.
- [drag-and-drop.md → `useDragHold` and `useLongPress`](../../drag-and-drop.md#usedraghold-and-uselongpress) — where `longPressProps` come from.
