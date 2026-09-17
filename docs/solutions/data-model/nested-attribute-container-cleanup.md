---
title: toggleAttribute treats a container of meta siblings as empty
date: 2026-09-17
category: data-model
module: attributes
problem_type: logic_error
component: frontend
symptoms:
  - Pin All appears to do nothing on a thought that already has a =children attribute
  - "An unrelated display setting such as =children/=bullet/None vanishes when =children/=pin is toggled off"
  - A deep toggleAttribute or deleteAttribute call removes an intermediate container that still holds meta children
  - The toggleAttribute suite stays green while the container is being destroyed
root_cause: visibility_filtered_predicate
resolution_type: code_fix
severity: medium
tags:
  - metaprogramming
  - attributes
  - pin
  - data-loss
  - toggleattribute
  - haschildren
---

# toggleAttribute treats a container of meta siblings as empty

## Problem

[`toggleAttribute`](../../../src/actions/toggleAttribute.ts) decides whether to delete an attribute container with [`hasChildren`](../../../src/selectors/getChildren.ts), which counts only *visible* children — and no meta attribute is visible — so toggling one key off under a shared container (`=children`, `=grandchildren`, `=descendants`) silently deletes the container and every unrelated meta sibling in it.

The delta over [Visibility and sorting](../../data-model.md#visibility-and-sorting) and the [selector reference](../../data-model.md#children) is one sentence: `hasChildren` is visibility-filtered, and is therefore not a safe emptiness test for a container that may hold meta attributes. `getAllChildren` is. The filter is conditional on `state.showHiddenThoughts`, which defaults off, so the destructive path is the default path — and turning hidden thoughts on to inspect the damage suppresses it.

The cleanup step is not one function's mistake. The same line, in the same position — after the recursion, before the return — appears in three actions:

| Action | Cleanup condition |
| --- | --- |
| [`toggleAttribute`](../../../src/actions/toggleAttribute.ts) | `firstSubthoughtId && !hasChildren(stateNew, firstSubthoughtId)` |
| [`deleteAttribute`](../../../src/actions/deleteAttribute.ts) | `firstSubthoughtId && !hasChildren(stateNew, firstSubthoughtId)` |
| [`toggleThought`](../../../src/actions/toggleThought.ts) | `values.length > 1 && subthoughtId && !hasChildren(stateNew, subthoughtId)` |

Which containers are exposed follows from [what an inheritance container is](../../metaprogramming.md#inheritance-children-grandchildren-and-descendants): `=view/Table` or `=sort/Alphabetical` hold ordinary visible values and read as non-empty, but `=children` is a shared namespace whose every child is a meta attribute, so it reads as empty even when it is full.

That is #4443. On

```
- A
  - B
    - =children
      - =bullet
        - None
    - C
```

Pin All with the cursor on `A/B/C` operates on `B` and, at the time, dispatched `toggleAttribute({ path: B, values: ['=children', '=pin'] })`. Two hazards fired in sequence. The single-value base case was unconditional then, so [`setFirstSubthought`](../../../src/actions/setFirstSubthought.ts) renamed `=children`'s first child — `=bullet` — to `=pin`. The cleanup step then read a `=children` holding one meta child as empty and deleted it. The command appeared to do nothing while destroying an unrelated display setting.

The report itself first placed `=pin` as a *sibling* of `=bullet` rather than as a child of `=children`, and had to be corrected mid-thread — the nesting is easy to misread even for the person who wrote the feature.

## Symptoms

- Pin All on a thought that already has a `=children` attribute leaves its children unpinned.
- `=children` disappears entirely, along with `=bullet`, `=style`, or whatever else was under it.
- The damage is invisible until the display changes: no error, no alert, and the toolbar icon reports the thought as unpinned, which is true.
- Every existing `toggleAttribute` test still passes.

## What Didn't Work

The contributor's opening plan was the right one on paper, and it is the plan #4502 was submitted as: *"This fixes the underlying generic attribute update behavior instead of special-casing `Pin All`"* — preserve sibling meta attributes when setting and when toggling terminal meta attributes, only delete a container when it has no children at all including meta children, and then simplify Pin All to set and delete `=children/=pin/true` directly.

It did not land. The merged diff touches [`pinAll.ts`](../../../src/commands/pinAll.ts) and its test, and nothing else — the generic semantics are unchanged in all three actions above. The reviewer accepted the narrowing explicitly rather than by omission: *"Eventually it would be good to generalize this functionality to toggle any deep attribute value, but this is a fine solution for the original issue."* Treat the workaround below as sanctioned, and the generic defect as outstanding.

## Solution

Pin All never hands the container to a cleanup step, on any of its three branches.

**Pinning on, container already populated** — `useExistingChildrenAttribute` in [`getPinAllState`](../../../src/commands/pinAll.ts) is set only when all three hold: a `=children` container exists, it does *not* already have a `=pin`, and it has at least one child whose value is not `=pin` (`hasNonPinChildrenAttribute`). When it fires, `toggleAttribute` is dispatched with a path that already ends at the container and `values: ['=pin', 'true']`, so `=children` is the *root* of the recursion rather than a `firstSubthoughtId` inside it, and the cleanup line never evaluates against it. [`setSortPreference`](../../../src/actions/setSortPreference.ts) writes the direction under `=sort` the same way, appending the `=sort` id to the path before toggling.

**Pinning on otherwise** — [`setDescendant`](../../../src/actions/setDescendant.ts) with `['=children', '=pin', 'true']`. It has no cleanup step at all.

**Unpinning** — the `unpinChildren` thunk removes `=pin` with `deleteAttribute`, then re-reads the container and deletes it itself, only when `getAllChildren(...).length === 0`. The re-read looks like belt and braces and is not: `deleteAttribute` carries the identical defect, so it may already have deleted the container. Neither outcome can be assumed, so the command checks and finishes the job with a count that includes meta children.

Both structures were copied into [`pinDescendants`](../../../src/commands/pinDescendants.ts) for `=descendants`, line for line with the names changed, when Pin Descendants was added in #4990.

The write side of the same family *was* fixed generically, which is what makes the asymmetry easy to miss. #5071 (6b58eb3325, *fix(heading): create the attribute instead of renaming the first child*) narrowed the single-value base case in both `setDescendant` and `toggleAttribute` with `!isAttribute(_values[0])`, because both "unconditionally overwrote the first subthought, treating a nullary attribute key as a value slot" — Heading on a thought with children renamed the first child to `=heading1`, the same rename #4443 suffered. Replaying #4443 against the current tree loses `=children` but no longer renames `=bullet`. `deleteAttribute` received neither fix.

## Why This Works

Scoping the dispatch to a path that already ends at the container removes the container from the recursion's cleanup set — the step only ever considers the subthought it descended *into*. Deciding emptiness with `getAllChildren` counts what `childrenMap` actually holds, which is the question being asked; `hasChildren` answers a rendering question instead.

The `deleteAttribute({ value: '=pin' })` call inside `unpinChildren` is safe for a reason worth knowing before reusing it: a single value returns from the base case and never reaches the cleanup line. A multi-value `deleteAttribute` call is exposed exactly as `toggleAttribute` is.

## Prevention

When writing a nested attribute under a container that may hold other meta attributes, do one of two things and nothing else:

- Scope the dispatch to a path that already ends at the container (`useExistingChildrenAttribute`), or
- decide emptiness yourself with `getAllChildren(state, id).length === 0` and remove the container in the command (`unpinChildren` / `unpinDescendants`).

`rg 'hasChildren\(stateNew' src/actions` returns the three exposed cleanup sites; a fourth appearing there is a new instance of this bug.

A green [`toggleAttribute`](../../../src/actions/__tests__/toggleAttribute.ts) suite is not evidence that a meta container survives. `preserve other descendants when toggling deep attribute off` is the test that covers this exact shape, and it passes — because the sibling it preserves, `m` under `w/x`, is a plain visible thought, which is the one case the predicate gets right. Rename `m` to `=bullet` and `x` is deleted along with it. Any new fixture for this area has to put a meta sibling such as `=bullet/None` in the container, which is also the missing regression test for #4443 at the reducer level rather than the command level.

## Related

- #4443 — Pin All does nothing on a thought with an existing `=children` attribute.
- #4502 — the merged fix, retargeted from generic reducers to `pinAll` alone.
- #4990 — Pin Descendants, which copied the workaround for `=descendants`.
- #5071 — the write-side twin, fixed generically in `setDescendant` and `toggleAttribute`.
- [data-model.md → Children](../../data-model.md#children) — `getAllChildren` / `getChildren` / `hasChildren`.
- [data-model.md → Visibility and sorting](../../data-model.md#visibility-and-sorting) — `childrenFilterPredicate` and why a meta attribute is not a visible child.
- [metaprogramming.md → Inheritance](../../metaprogramming.md#inheritance-children-grandchildren-and-descendants) — what a shared container is and which attributes propagate.
- [metaprogramming.md → Pinning & expansion](../../metaprogramming.md#pinning--expansion) — `=children/=pin/true` and `=descendants/=pin/true`.
- [commands.md → Pin All](../../commands.md#pin-all) / [Pin Descendants](../../commands.md#pin-descendants) — the user-facing behaviour.
- [glossary.md](../../glossary.md) — `attribute / meta-attribute`, `childrenMap`.
