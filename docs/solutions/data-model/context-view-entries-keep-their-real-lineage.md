---
title: Context view entries keep their real lineage, so attributes leak in
date: 2026-09-17
category: data-model
module: context_view
problem_type: logic_error
component: frontend
symptoms:
  - A context view entry is numbered by a `=children/=bullet/Ordered` belonging to a thought it is not displayed under
  - A context view entry has no bullet, or a shifted margin, because some unrelated thought has `=view/Table`
  - A context in the context view is expanded by someone else's `=pin`
  - The guard beside the leak reads correctly in English and is still wrong
root_cause: wrong_predicate
resolution_type: code_fix
severity: medium
tags:
  - context-view
  - metaprogramming
  - predicates
  - bullet
  - attributes
  - inheritance
---

# Context view entries keep their real lineage, so attributes leak in

## Problem

Three expressions over the context view sit within a few lines of each other and read almost identically. Only one of them answers *is this thought a context view entry?*

| Expression | Where | Means |
| --- | --- | --- |
| `isContextViewActive(state, path)` | `showContexts` in [`Bullet`](../../../src/components/Bullet.tsx), `showContexts` in [`expandThoughts`](../../../src/selectors/expandThoughts.ts) | this thought's **children** are contexts — the view is open *on* it |
| the `showContexts` **prop** | set as `showContexts: contextViewActive` in [`linearizeTree`](../../../src/selectors/linearizeTree.ts), carried on [`TreeThought`](../../../src/@types/TreeThought.ts) through [`VirtualThought`](../../../src/components/VirtualThought.tsx) into [`Thought`](../../../src/components/Thought.tsx) | the same question, answered when the tree was last linearized — deliberately stale |
| `isContextViewActive(state, parentOf(path))` | `isInContextView` in [`Thought`](../../../src/components/Thought.tsx), passed down to `Bullet` | this thought **is** a context view entry |

Attribute propagation must be guarded on the third. #4956 shipped because a correct comment sat above the first.

The leak exists because [`linearizeTree`](../../../src/selectors/linearizeTree.ts) substitutes only the *rendered* thought, not its lineage: `contextViewActive ? getThoughtById(state, filteredChild.parentId) : filteredChild`, and then `simplePath: contextViewActive ? thoughtToPath(state, child.id) : …`. So an entry's `thoughtId` is the context's parent and its `simplePath` is that thought's real position in the home tree. The context itself survives only in `key`, `leaf`, and `contextId` — the last handed to the next level of recursion so the entry's *children* are read from the context. Every lookup that resolves through `rootedParentOf(state, simplePath)` or `thought.parentId` therefore reads the real parent's `=children`/`=grandchildren` and applies it to a thought that is standing in for something else. The data shape itself is [Context view](../../data-model.md#context-view) and [Context view recursion](../../data-model.md#context-view-recursion).

The naming makes it worse. [`StaticThought`](../../../src/components/StaticThought.tsx) declares `showContexts` on its own `ThoughtProps`, never destructures it, and defines a local `const showContexts = useSelector(state => isContextViewActive(state, rootedParentOf(state, path)))` carrying the *third* meaning — which is what it wants, since it uses the answer to recompute the entry's live `SimplePath` through `thoughtToPath`. The name never tells you which question is being asked; only the argument does.

[`Thought`](../../../src/components/Thought.tsx) carries a comment warning against the prop — *"must use isContextViewActive to read from live state rather than showContexts which is a static propr from the Subthoughts component"* (its typos `propr` and `showContext` are load-bearing for grep, and `Subthoughts` no longer exists). It says nothing about which argument to pass, and it floats between `const value = …` and `useDragHold` with no call site adjacent to it.

## Symptoms

Three leaks of the same defect, each reported as an unrelated rendering bug:

- **#2723** — `=pin` under one context expands a *different* context in the view.
- **#2724** — an entry under a `=view/Table` parent loses its bullet and its margin drifts out of line with its siblings.
- **#4956** — with `=children/=bullet/Ordered` on `b` and `b/c/m` in the tree, opening the context view on `a/m` renders the entry `c` as `2.`.

None of them fails a test written outside the context view, because outside the context view the lookup is correct.

## What Didn't Work

**Guarding on `showContexts` alone.** Before 848d632b98 (#4957), [`Bullet`](../../../src/components/Bullet.tsx)'s `ordered` selector read:

```ts
// Ordered numbering does not apply in the context view.
if (showContexts) return null
```

The comment is right and the predicate does not compute it. `showContexts` is true for the nominal context `m`, whose children are the contexts; it is false for each entry, which is the thought actually being numbered. The guard fires on the one row that was never going to be numbered and never on the rows that were.

**Walking the ancestors.** #2736's first implementation asked whether *any* ancestor had the context view active, and review narrowed it to `isContextViewActive(state, parentOf(path))`. Recursion over-applies: children rendered *inside* a context view entry are not themselves entries, and suppressing their inheritance would break `=children` for every thought below the first entry.

## Solution

Compute the predicate once, in [`Thought`](../../../src/components/Thought.tsx), as `isContextViewActive(state, parentOf(path))`, and pass it down as `isInContextView`. The current guard sites:

| Site | Guard | What it stops |
| --- | --- | --- |
| [`Bullet`](../../../src/components/Bullet.tsx) — `ordered` | `if (showContexts \|\| isInContextView) return null` | `=children/=bullet/Ordered\|Alpha` numbering an entry |
| [`Subthought`](../../../src/components/Subthought.tsx) — `hideBullet` | `if (isContextViewActive(state, parentOf(path))) return false` | `=children`/`=grandchildren` `=bullet/None` hiding an entry's bullet |
| [`BulletCursorOverlay`](../../../src/components/BulletCursorOverlay.tsx) — `hideBulletProp` | `if (isInContextView) return false` | the same, for the overlay, which must stay aligned with the thought |
| [`useHideBullet`](../../../src/hooks/useHideBullet.ts) — `hideBulletTable` | `!isInContextView && …` | `=view/Table` hiding a non-cursor entry's bullet |
| [`BulletPositioner`](../../../src/components/BulletPositioner.tsx) | `!isInContextView && isTableCol1` | the table column-1 margin shift |
| [`expandThoughts`](../../../src/selectors/expandThoughts.ts) | `!showContexts && (…)` | `:`, `=pin`, `=children/=pin` and `=descendants/=pin` expanding a context |

Two of those rows need reading carefully.

`useHideBullet` guards on the **prop** it receives from `Thought`, not on a local selector, so grepping that file for `isContextViewActive` finds nothing.

`expandThoughts` is the apparent exception and is not one. It guards from the parent's side: it is iterating the children of `path`, so `showContexts = isContextViewActive(state, path)` and "the view is open on me" and "these children are entries" are the same statement. Same predicate, opposite end. Its recursion drops `descendantsPinned` on the same branch (`showContexts ? null : descendantsPinned`) so `=descendants/=pin` does not reach into a context's subtree either.

## Why This Works

`parentOf(path)` is the **displayed** parent — the path the context view is open on. `rootedParentOf(state, simplePath)` is the **real** parent. For an ordinary thought they name the same thought and the distinction is invisible; for a context view entry they are different thoughts, which is the entire defect. The guard asks its question in `Path` space, where the entry is where the user sees it; the leaking lookups ask theirs in `SimplePath` space, where the entry still lives where it always did.

That is also why the recursive form is wrong rather than merely expensive. The displacement is exactly one level deep: the recursion into an entry recomputes `simplePath` with `simplifyPath` and reads its children through `contextId`, so a grandchild's real parent is the context it is displayed under. [`Subthought`](../../../src/components/Subthought.tsx) finds its `=children` through `thought.parentId` and gets the right one — for `a/m~/b/y` that is `b/m`, not `b`. Only the entry row itself is displaced.

The same crossing bites outside rendering: [`prevSibling`](../../../src/selectors/prevSibling.ts) infers the context view from the parent path, so a caller holding a `SimplePath` must pass `{ showContexts: false }` — see [Basic traversal](../../data-model.md#basic-traversal).

## Prevention

- **Adding an attribute to the propagable set is adding a context-view exemption.** The set is listed in [Inheritance: `=children`, `=grandchildren`, and `=descendants`](../../metaprogramming.md#inheritance-children-grandchildren-and-descendants); the one exemption written down as a rule is the closing sentence of the [`=bullet`](../../metaprogramming.md#display--layout) entry. Extend that sentence rather than adding a second, parallel paragraph.
- **Pair every new propagation with a context view test.** [`src/components/__tests__/Bullet.ts`](../../../src/components/__tests__/Bullet.ts) has the three to copy: `do not apply =children/=bullet to context view entries`, its `/None` variant, and `render bullets in context view entries even when parent has =view/Table`. A leak passes every test written in normal view.
- **Enumerate the candidates mechanically.** `rg -n 'rootedParentOf\(state, simplePath\)|thought\.parentId' src/components src/hooks` lists the lookups that resolve in real-lineage space. For each, ask what it returns when `isContextViewActive(state, parentOf(path))`.
- **In review, read the argument, not the variable name.** A comment saying "context view" is not evidence; `isContextViewActive(state, path)` and `isContextViewActive(state, parentOf(path))` are different questions and `showContexts` has been used as the name of both.
- **Attribute *editing* lands where the guards then discard it.** [`BulletPicker`](../../../src/components/BulletPicker.tsx) reads and writes `=children/=bullet` on `simplifyPath(state, rootedParentOf(state, state.cursor))`, as does [`toggleBulletPicker`](../../../src/commands/toggleBulletPicker.ts)'s `isActive`. With the cursor on a context view entry that resolves to the nominal context, whose `=children` every guard above ignores. That is its own issue, not a widening of these guards.

## Related

- #2723, #2731, #2724, #2736, #4956, #4957
- #3391, #5100 — the same lineage fact in [`categorize`](../../../src/actions/categorize.ts), where `allSameParent` compares `parentOf(simplifyPath(state, path))` and so refuses a multiselect spanning context view rows; the rationale is written out above the `multiple contexts` block in [`src/actions/__tests__/categorize.ts`](../../../src/actions/__tests__/categorize.ts).
- [Context view](../../data-model.md#context-view) and [Context view recursion](../../data-model.md#context-view-recursion) — the data shape, `appendChildPath`, circular paths. The `isContextViewActive` entry in the context view selector list does not say that the argument decides the meaning.
- [Inheritance: `=children`, `=grandchildren`, and `=descendants`](../../metaprogramming.md#inheritance-children-grandchildren-and-descendants) — how the propagable attributes resolve, and which ones they are.
- [`linearizeTree` (the in-order traversal)](../../layout-rendering.md#linearizetree-the-in-order-traversal) — where the context view pivot happens.
- [Glossary](../../glossary.md) — **context view**, **nominal context**, **cyclic context**.
