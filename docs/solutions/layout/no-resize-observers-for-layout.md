---
title: Layout is measured from enumerated dependencies, never a ResizeObserver
date: 2026-09-17
category: layout
module: layout_rendering
problem_type: architecture_pattern
component: frontend
severity: medium
applies_when:
  - Adding a ResizeObserver to anything that renders once per thought
  - Observing an element whose size changes on every animation frame
  - A measured width or height goes stale and an observer is the obvious fix
  - "The console reports: ResizeObserver loop completed with undelivered notifications"
  - Adding a dependency that can change a thought's height or a divider's width
tags:
  - layout
  - resizeobserver
  - performance
  - measurement
  - virtualthought
  - animation
---

# Layout is measured from enumerated dependencies, never a ResizeObserver

## Context

[`Divider`](../../../src/components/Divider.tsx) sizes itself to its widest sibling by reading `getBoundingClientRect().width` off each sibling's editable, and it decides *when* to do that from a `useLayoutEffect` over `editingThoughtId`, `editingValueUntrimmed`, `fontSize` and `updateDividerWidth`, plus a `viewportStore.useSelectorEffect` on `innerWidth`. Nothing beside that list says why it is not a `ResizeObserver` on the siblings, which is what it briefly became during #2764 — the reviewer endorsed the switch ("I much prefer the observers rather than using the timestamp-from-a-store approach") and withdrew it two reviews later: "I apologize for leading you to believe that `ResizeObserver` was a viable solution." The dependency list is the thing that replaced it.

`grep -rn ResizeObserver src packages` returns three hits in the whole tree: [`ScrollZone`](../../../src/components/ScrollZone.tsx), [`DialogContent`](../../../src/components/dialog/DialogContent.tsx), and a jsdom mock in [`setupTests.ts`](../../../src/setupTests.ts). Zero in the thought render path, which is where measurement actually happens — [`VirtualThought`](../../../src/components/VirtualThought.tsx) measures every thought on screen and feeds [`useSizeTracking`](../../layout-rendering.md#usesizetracking-and-the-sizes-map).

That absence is deliberate and old. Per-thought `ResizeObserver`s were em's original height measurement and were torn out as "extremely slow"; the estimate-then-measure pipeline described in [layout-rendering.md → Two-pass render](../../layout-rendering.md#two-pass-render) is what took their place. The history survives only in a review comment on #2412.

## Guidance

**Do not attach a `ResizeObserver` per element in the thought tree, and do not attach one to an element whose size changes every frame.** The policy as stated in #3246, when a contributor proposed one on the command drawer: "I'd be concerned about the performance of a ResizeObserver on an animated element. We actually avoid ResizeObservers almost entirely for performance reasons."

The cost model behind both halves is the same. An observer fires once per observed element per layout pass, so one per thought turns a single tree-wide reflow into N callbacks that each write state and can themselves retrigger layout; an element animating its own size produces a layout pass every frame, so one observer on it fires 60 times a second for the duration. An enumerated dependency list fires once, after layout, in a frame the code chose.

**Measure from an enumerated dependency list instead.** `VirtualThought` drives `updateSize` from [`useLayoutAnimationFrameEffect`](../../../src/hooks/useLayoutAnimationFrameEffect.ts) over eleven dependencies, then three subscriptions the array cannot express — the cursor, `=style`, and the viewport's `innerWidth` — and a `useEffect` on the thought's `value`. [layout-rendering.md → `VirtualThought` — when does it re-measure?](../../layout-rendering.md#virtualthought--when-does-it-re-measure) is the canonical list. What it does not say is that the list *is* the alternative to an observer: anything new that can change a thought's height has to be added to it by hand, and that maintenance is the price the rule accepts rather than a sign the design is incomplete. The four-word parenthetical above the array — `(Height observers are slow.)` — is the only trace of the rule anywhere in the tree.

**Reading a motion value off an animation the compositor is already running is not the same thing, and it is the shipped pattern.** `useSheetTransforms` in [`CommandCenter`](../../../src/components/CommandCenter/CommandCenter.tsx) reads the sheet's live `yInverted` through `useTransform` and derives `height`, `opacity` and `blurHeight` from it. It reads no DOM geometry and invalidates no layout — it samples a value the animation library is already updating. The prohibition is on observing geometry, not on following an animation.

**The two live observers are bounded exceptions, and the bound is what makes them exceptions:**

| Where | What it observes | Why it is not the prohibited case |
| --- | --- | --- |
| `useScrollParallax` in [`ScrollZone`](../../../src/components/ScrollZone.tsx) | `document.body`, to rebuild the `ScrollTimeline` animation when document height changes | Gated on `supportsScrollTimeline` — the animation it rebuilds is compositor-driven and off the main thread. Browsers without it take a JS `scrollTop` fallback with no observer at all. |
| [`DialogContent`](../../../src/components/dialog/DialogContent.tsx) | the dialog's scroller element, alongside a passive `scroll` listener, to refresh scrollbar-thumb geometry | One observer on one container, outside the thought tree, on an element that does not animate its own size. |

The third grep hit, `ResizeObserverMock` in [`setupTests.ts`](../../../src/setupTests.ts), is a no-op class stubbed via `vi.stubGlobal` because jsdom does not implement `ResizeObserver`. It exists for those two call sites. It is not license for a third.

**Measuring in a frame you chose has its own failure mode, and it is already fixed once.** `useLayoutAnimationFrameEffect` takes `callback` as a dependency and most call sites pass an inline arrow, so the effect re-runs on essentially every render. Before #5131 (140060f10e) nothing cancelled the queued frame, so each render left another one behind: a virtualization test showed 301 pending animation frames with nine thoughts rendered, 300 of them from this hook, firing in a burst against thoughts that had since re-rendered or unmounted. The cleanup now calls `cancelAnimationFrame`, bounding it at one frame per live hook instance. Its JSDoc covers why the hook is `useLayoutEffect` + `requestAnimationFrame` and why iOS Safari needs an extra frame; read it there rather than re-deriving it.

## Why This Matters

This is a rule you cannot grep for, because it is the absence of a pattern. A contributor adding an observer to a new component is not touching `VirtualThought`, so the one comment that records the rule is in a file they will never open — and the instance that is actually easiest to find, `Divider`, carries no comment at all. Outside `docs/solutions/`, the string `ResizeObserver` appears nowhere in `docs/`, `AGENTS.md`, [code-standards](../../../.github/instructions/code-standards.instructions.md), or the lint rules in [`packages/eslint-plugin-em`](../../../packages/eslint-plugin-em).

The recurrence is the argument. Three threads reached for an observer independently — #2764 on divider widths, #3246 on the command drawer, and #3356, which shipped — and in the first two a reviewer had to state the rule by hand. The third reached production: shrinking the viewport until a thought wrapped printed `ResizeObserver loop completed with undelivered notifications` across the top of the screen, because the width observer in `Content`'s `useContentWidth` was writing `viewportStore.contentWidth` from inside the layout it was observing. #3367 replaced it with a `window` `resize` listener — the same substitution this file describes, arrived at a third time, and merged with the caveat that it removes the error rather than solving the underlying `useDropHoverWidth` problem.

[drag-and-drop.md → Performance considerations](../../drag-and-drop.md#performance-considerations) is the precedent for writing the cost model down rather than rediscovering it per event: `DragOnly`, `moize` on `canDropPath`, `throttleByMousePosition`. This is the layout half of the same habit.

## When to Apply

- **Before adding a `ResizeObserver`, count the elements it will observe and ask whether any of them animates its size.** More than one per screen, or one that animates, means the answer is a dependency list or an event listener.
- **When a measured value goes stale, add the thing that changed it to the dependency list.** For a thought's height that is `VirtualThought`'s array or a fourth subscription beside the cursor, `=style` and `innerWidth`; for a divider width, `Divider`'s `useLayoutEffect` array. Then update [layout-rendering.md → `VirtualThought` — when does it re-measure?](../../layout-rendering.md#virtualthought--when-does-it-re-measure), which is the list readers actually consult.
- **Treat `ResizeObserver loop completed with undelivered notifications` as a design report, not a warning to silence.** It means the observer's callback changed the layout it observes. Removing the observer removes the loop; raising a flag or deferring the write hides it.
- **Prefer a coarser signal that is already tracked.** `viewportStore`'s `innerWidth` and a `window` `resize` listener cover everything that changes only with the viewport, which is most of what an observer gets reached for.
- **`grep -rn ResizeObserver src packages` should return three hits.** A fourth is the review question. The jsdom mock means a new one will not fail a unit test, so nothing else catches it.

## Examples

`Divider`, the uncommented instance — measurement and its triggers, with no observer between them:

```tsx
const updateDividerWidth = useCallback(() => {
  if (!dividerRef.current) return

  const widths = getThoughtWidths(widthDependentThoughtIds)
  setDividerWidth(Math.max(...widths, DIVIDER_MIN_WIDTH))
}, [widthDependentThoughtIds])

useLayoutEffect(updateDividerWidth, [editingThoughtId, editingValueUntrimmed, fontSize, updateDividerWidth])

const selectInnerWidth = useCallback((state: ViewportState) => state.innerWidth, [])
viewportStore.useSelectorEffect(updateDividerWidth, selectInnerWidth)
```

`VirtualThought`, the commented one:

```tsx
// Recalculate height when anything changes that could indirectly affect the height of the thought. (Height observers are slow.)
useLayoutAnimationFrameEffect(updateSize, [
  cursorDepth, cursorLeaf, fontSize, isVisible, leaf, note,
  simplePath, style, isContextViewActive, editingValue, wrappingWidth,
])
```

Considered on the command drawer in #3246 and set aside — do not retry without new information:

- **Reading the drawer's height from a ref inside the render function.** Rejected as nonreactive: it does not re-render when the height changes, and the value read on a given render implicitly depends on the timing of the component lifecycle and state updates, so it is either stale or accidentally correct. "The value will end up either being outdated sometimes, or fortuitously never outdated, which is not something you want to rely on."
- **Mounting the `ResizeObserver` only while the menu was open,** to bound the cost. Floated in the thread and never taken up; it does not bound anything, because the whole window during which the observer is mounted is the window during which the drawer is animating.
- **Moving the blur layer out of the portal so it would inherit the drawer's height** and need no measurement. It appeared to work for the wrong reason — the blur was being broken by `mix-blend-mode: screen` creating a stacking context, not by the portal. See [When a blur, a blend, or a z-index silently does nothing](../styling/compositing-traps-blur-blend-stacking.md).

What shipped was an overlay that fades and slides on its own transition, matched to the drawer's duration and easing, with the gesture-proportional fade deferred rather than bought with an observer. The drawer has since been rebuilt on a motion-value sheet, which is the `useSheetTransforms` case above — the deferred question was answered there, still without observing geometry.

## Related

- #2412, #2764, #3246, #3356, #3367, #5131
- [layout-rendering.md → `VirtualThought` — when does it re-measure?](../../layout-rendering.md#virtualthought--when-does-it-re-measure) — the canonical trigger list this file is the rationale for.
- [layout-rendering.md → Two-pass render](../../layout-rendering.md#two-pass-render) — why heights are measured at all.
- [layout-rendering.md → `useSizeTracking` and the `sizes` map](../../layout-rendering.md#usesizetracking-and-the-sizes-map) — where a measurement goes after `onResize`.
- [no-multiline-flag-thought-spacing.md](no-multiline-flag-thought-spacing.md) — the other trigger list that could not be replaced by an observer either.
- [glossary.md](../../glossary.md) — `VirtualThought`.
- [drag-and-drop.md → Performance considerations](../../drag-and-drop.md#performance-considerations) — the per-event cost models, the precedent for this one.
- [`useLayoutAnimationFrameEffect`](../../../src/hooks/useLayoutAnimationFrameEffect.ts) — the five reasons for `useLayoutEffect` + `requestAnimationFrame`, in its own JSDoc.
- [When a blur, a blend, or a z-index silently does nothing](../styling/compositing-traps-blur-blend-stacking.md) — the compositing trap that made the #3246 blur look like a height problem.
