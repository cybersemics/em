---
title: "Every keystroke re-rendered every thought: reference identity in the LayoutTree path"
date: 2026-09-17
category: layout
module: layout_rendering
problem_type: performance_issue
component: frontend
symptoms:
  - Typing gets slower the more thoughts the thoughtspace holds
  - React DevTools shows every VirtualThought re-rendering on every keystroke
  - "LayoutTree subtree render time of 230.6 ms per keystroke at ~240 thoughts"
  - Nothing fails - no test asserts on renders per keystroke
root_cause: reference_identity
resolution_type: code_fix
severity: high
tags:
  - performance
  - react-memo
  - linearizetree
  - virtualthought
  - moize
  - rerender
---

# Every keystroke re-rendered every thought: reference identity in the LayoutTree path

## Problem

When typing degrades as the thoughtspace grows, the cost is not the render — it is reference identity. Two independent leaks sit between a keystroke and the rendered tree; the fix closed one and bounded the other.

**The selector.** [`LayoutTree`](../../../src/components/LayoutTree.tsx) subscribes with `useSelector(linearizeTree, isEqual)` — a lodash deep equality, so the subscription only skips a re-render when the *entire* linearized list is value-equal. `TreeThought` originally carried the whole `Thought`, and a reducer replaces that object on every edit (`value`, `lastUpdated`), so the deep compare failed on every keystroke and the whole list re-rendered. `treeThoughts` is recalculated whenever Redux state changes ([Two lists, one ordering](../../layout-rendering.md#two-lists-one-ordering)); the deep compare is the only thing standing between that recalculation and a render.

**The memo.** Even with the list unchanged, `React.memo`'s default shallow compare on [`VirtualThought`](../../../src/components/VirtualThought.tsx) failed, because `path` and `simplePath` are freshly allocated arrays. [`appendToPathMemo`](../../../src/util/appendToPath.ts) is a `moize` LRU with `maxSize: 100`, and [`linearizeTree`](../../../src/selectors/linearizeTree.ts) builds both `childPath` and `simplePath` through it — so past roughly 100 visible paths the cache evicts and hands back new array references for paths that did not change. (This is a different cache from `canDropPath`'s `maxSize: 50`; see [Performance considerations](../../drag-and-drop.md#performance-considerations).)

The chain matters for knowing where the damage stops. `LayoutTree` maps `treeThoughtsPositioned` to [`TreeNode`](../../../src/components/TreeNode.tsx), which is **not** memoized — `export default TreeNode`, no `React.memo` — and `TreeNode` forwards to `VirtualThoughtMemo`. The memo boundary that protects the expensive subtree is `VirtualThought` alone. See [Render tree](../../layout-rendering.md#render-tree).

## Symptoms

Typing degraded roughly linearly with thoughtspace size. Measured in 2024 at ~240 thoughts, the `LayoutTree` subtree took **230.6 ms per keystroke**; after the fix, **2.5 ms** (#2314). React DevTools attributed it to every `VirtualThought` re-rendering, not to any one of them being slow. No test failed, then or now: the only render-commit assertion in the suite, [`LayoutTree.virtualization.ts`](../../../src/components/__tests__/LayoutTree.virtualization.ts), drives scroll events.

That test guards the mechanism described under [Virtualization](../../layout-rendering.md#virtualization) — each `TreeNode` subscribing to `scrollTopStore` with a selector returning only a boolean, so *scrolling* does not re-render the list. It does nothing for a keystroke, where the list is rebuilt and every visible node is rendered regardless.

## What Didn't Work

**Memoizing `childPath` in `LayoutTree`.** Tried first, on the assumption that `path` and `simplePath` *should* be stable across an edit. It did not help, and the reason it did not is the moize eviction above.

**Raising `appendToPathMemo`'s cache size.** Tried next, and it appeared to work: the re-renders vanish — until enough thoughts refill the cache. The LRU evicts by number of distinct `(path, id)` combinations, not by staleness, so a larger `maxSize` only moves the cliff further out. Widening the memo's *use* is not available either: [`appendToPath.ts`](../../../src/util/appendToPath.ts) still carries a standing TODO that the memoized variant makes the context view disappear.

**Serialising paths** — `path.join(',')` on the way down and `split(',')` on the way back — was raised as a way to make paths compare by `===` for free, and rejected as the wrong shape to pass around in memory.

The conclusion the thread reached is that paths are not worth stabilising: compare them by value at the one boundary that cares.

## Solution

7e6bb060c9 (#2347) made two changes.

`TreeThought` carries [`thoughtId: ThoughtId`](../../../src/@types/TreeThought.ts) in place of the `Thought`. Nothing downstream lost anything by it — the consumers of that field want the id (`dropUncle={thoughtId === cursorUncleId}`, `data-thought-id`), not the object.

`VirtualThought` gets a hand-written `arePropsEqual`, at the bottom of [`VirtualThought.tsx`](../../../src/components/VirtualThought.tsx):

```ts
const VirtualThoughtMemo = React.memo(VirtualThought, (prevProps, nextProps) => {
  let isEqual = true

  for (const key in prevProps) {
    if (key === 'path' || key === 'simplePath') {
      isEqual = equalPath(prevProps[key], nextProps[key])
      if (!isEqual) break
    } else if (prevProps[key as VirtualThoughtPropsKeys] !== nextProps[key as VirtualThoughtPropsKeys]) {
      isEqual = false
      break
    }
  }

  return isEqual
})
```

One leak is closed; the other is bounded, not closed. `TreeThought` still carries a whole `Thought` as `prevChild` — assigned `prevChild: filteredChildren[i - 1]` in `linearizeTree` — so editing a thought still fails the deep `isEqual` whenever that thought is the previous visible sibling of another, and `LayoutTree` plus every `TreeNode` still re-renders. What keeps that from cascading into every thought is the comparator, and the fact that `prevChild` never reaches it: `TreeNode` passes `prevChildId={prevChild?.id}`, [`VirtualThoughtProps`](../../../src/@types/VirtualThoughtProps.ts) declares `prevChildId?: ThoughtId`, and [`DropHover`](../../../src/components/DropHover.tsx) resolves it with `getThoughtById` inside its own selector. A primitive crosses the memo boundary; the object stays above it.

## Why This Works

[`equalPath`](../../../src/util/equalPath.ts) compares two paths element-wise with `===`, so a path the moize cache evicted and rebuilt out of the same ids compares equal to the one the previous render held. (Its docstring describes an identity of `{ value, rank }`, which is stale — a `Path` is a `ThoughtId[]`; see [Path](../../data-model.md#path).) Every other prop is still compared with `===`, so the comparator costs the default shallow compare plus one walk of the path length.

The consequence for anything new on this path: **every non-primitive prop passed to `VirtualThought` must be reference-stable, or it silently defeats the comparator and re-renders every visible thought on every keystroke.** An unrecognised key falls through to the `===` branch, `TreeNode` offers no memo boundary of its own, and nothing asserts on renders per keystroke, so the regression shows up only as typing that feels heavier on a large thoughtspace. Today the non-primitive props are `path`, `simplePath`, `env`, `onResize` and `style` — each already stable by construction:

| Prop | What keeps it stable |
| --- | --- |
| `path`, `simplePath` | The `equalPath` branch in the comparator |
| `env` | `linearizeTree` passes the inherited `env` through unchanged when a level defines no `=let` bindings — commented at the assignment, and the `=let` bullet in [`linearizeTree`](../../layout-rendering.md#linearizetree-the-in-order-traversal) |
| `style` | `cliffPaddingStyle`, memoized in `LayoutTree` with an explicit comment saying why |
| `onResize` | A `useCallback` in `TreeNode` wrapping `setSize` from [`useSizeTracking`](../../layout-rendering.md#usesizetracking-and-the-sizes-map) |

The `env` case is the one worked example documented on both sides — in the code and in `docs/`. It is a precedent to follow, not a special case.

## Prevention

- **Adding an object, array or function prop to `VirtualThought` is a change to the comparator.** Stabilise it at its source (`useMemo` / `useCallback` in `LayoutTree` or `TreeNode`, or pass-through by reference in `linearizeTree`), or pass a primitive instead — `prevChildId` is the model — or give it a branch alongside `path` and `simplePath`. Every prop that crosses the boundary is in one JSX block in [`TreeNode.tsx`](../../../src/components/TreeNode.tsx).
- **Prefer a `ThoughtId` to a `Thought` on `TreeThought`.** A field holding a whole `Thought` fails `useSelector(linearizeTree, isEqual)` on every edit that touches it. `prevChild` is the one that remains; do not add a second.
- **Do not treat a `moize`'d value as reference-stable.** `appendToPathMemo` is capped at 100 and `canDropPath` at 50; past the cap both return fresh references for unchanged inputs. Compare by value at the boundary, as the comparator does.
- **Measure before and after any change to this path**, since nothing else will tell you: React DevTools Profiler, a thoughtspace of a few hundred thoughts, record one keystroke, read the `LayoutTree` subtree time. 230.6 ms → 2.5 ms is the shape of the difference this bug makes.

## Related

- #2314, #2347
- [`linearizeTree` (the in-order traversal)](../../layout-rendering.md#linearizetree-the-in-order-traversal) and [Two lists, one ordering](../../layout-rendering.md#two-lists-one-ordering) — what the selector produces and when it is recalculated.
- [Render tree](../../layout-rendering.md#render-tree) — where `VirtualThought` sits under `TreeNode`.
- [Virtualization](../../layout-rendering.md#virtualization) — the scroll-path protection, which is not this one.
- [`VirtualThought` — when does it re-measure?](../../layout-rendering.md#virtualthought--when-does-it-re-measure) — what a render of a thought actually costs.
- [Path](../../data-model.md#path), [`appendToPath`](../../data-model.md#basic-traversal), [`equalPath`](../../data-model.md#predicates).
- [Performance considerations](../../drag-and-drop.md#performance-considerations) — `canDropPath`, the sibling `moize` cache.
