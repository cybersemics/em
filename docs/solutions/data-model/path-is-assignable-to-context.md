---
title: A Path is assignable to a Context, so the brand protects one direction only
date: 2026-09-17
category: data-model
module: selectors
problem_type: best_practice
component: frontend
severity: medium
applies_when:
  - Calling a selector or helper whose parameter is typed string[]
  - Passing a Path or SimplePath to a parameter named context, at, from, or pathUnranked
  - Reviewing a guard that asks whether a path or thought still exists
  - Migrating a call site off contextToPath
tags:
  - types
  - brand
  - path
  - context
  - selectors
  - silent-failure
---

# A Path is assignable to a Context, so the brand protects one direction only

## Context

The brand on [`ThoughtId`](../../data-model.md#thoughtid) stops a raw string reaching a parameter that wants an id. It does nothing in the other direction, and nothing in the tree says so: [`Path`](../../data-model.md#path) is `[ThoughtId, ...ThoughtId[]]` and [`Context`](../../data-model.md#context) is `string[]`, so a `Path` is structurally a `Context` and assigns to one with no cast and no complaint. The brand is a one-way valve.

What receives it resolves *values*. [`contextToPath`](../../../src/selectors/contextToPath.ts) matches each element of the array against thought text:

```ts
return (showContexts ? getThoughtById(state, child.parentId)?.value : child.value) === value
```

Either branch compares a user-authored value against the array element, so a 32-character hex id matches nothing. The reduce then throws `Error('Thought not found')`, and `contextToPath`'s own `catch (e) { return null }` swallows it. The `null` that comes back is indistinguishable from the `null` for a context that genuinely does not exist. [`pathExists`](../../../src/selectors/pathExists.ts) is `!!contextToPath(…)`, so it reports `false`. [`contextToThoughtId`](../../../src/selectors/contextToThoughtId.ts) arrives at the same answer down a separate recursive walk, on `target[targetIndex] === child.value`.

[`jump`](../../../src/actions/jump.ts) was the instance (#5113). Its guard read:

```ts
const cursorNew =
  lastJumpCursor && !pathExists(state, lastJumpCursor) ? thoughtToPath(state, head(lastJumpCursor)) : lastJumpCursor
```

`lastJumpCursor` comes from `state.jumpHistory`, typed `(Path | null)[]` and prepended with `state.cursor` verbatim by [`updateJumpHistoryEnhancer`](../../../src/redux-enhancers/updateJumpHistoryEnhancer.ts) ([glossary → jump history](../../glossary.md)) — ids, handed to a parameter that wanted values. #5113 ran both calls against a real state and printed them side by side: `pathExists(state, realPath)` was `false` for a perfectly valid path while `pathExists(state, ['a', 'b'])` was `true`. The ternary had always taken the `thoughtToPath` branch, and the comment above it — *"it is possible that the thought id exists but has been moved"* — described a condition that was never conditional. Reading the name, the signature and that comment was what produced the wrong model.

`jump` no longer calls `pathExists` at all: it filters with `(cursor): cursor is Path => … && !!getThoughtById(state, head(cursor))` and rebuilds unconditionally through `thoughtToPath`. The hazard that outlived the fix is the signature it used to call — `pathExists(state, pathUnranked?: string[] | null)`, a parameter named for a path that wants a Context — and the rest of the value-resolving family beside it.

## Guidance

**When a helper takes `string[]`, confirm at the call site whether it wants values or ids.** The compiler will not, and neither of the two wrong answers throws:

| Function | Parameter | Wants | Handed a `Path`, answers |
| --- | --- | --- | --- |
| [`contextToPath`](../../../src/selectors/contextToPath.ts) | `context: string[]` | values | `null` |
| [`pathExists`](../../../src/selectors/pathExists.ts) | `pathUnranked?: string[] \| null` | values | `false` |
| [`contextToThoughtId`](../../../src/selectors/contextToThoughtId.ts) | `thoughts: Context` | values | `null` |

**Convert explicitly, or do not round-trip through values at all.** The two surviving `pathExists` calls, at lines 190 and 194 of [`initEvents`](../../../src/util/initEvents.ts), both wrap the argument in `pathToContext(state, path)` — the right shape. Where an id is already in scope, `thoughtToPath(state, id)` resolves in one step and keeps identity ([data-model.md → Lookup & conversion](../../data-model.md#lookup--conversion)); #5112 moved another caller across that way. That `contextToPath` is additionally lossy across duplicate siblings is already written down three times: its own JSDoc, the `contextToThoughtId` entry in that same reference, and the `descendantPath` comment in [`importFiles`](../../../src/actions/importFiles.ts).

**A cast opens the same hole one step earlier, and can invert it.** [`decodeThoughtsUrl`](../../../src/selectors/decodeThoughtsUrl.ts) builds its result with `urlPath.map(componentToThought) as Path` — an array of *values*, asserted to be a `Path`. `onPopstate` then does the correct-looking thing and converts it, so `pathToContext` runs `getThoughtById` over thought text, finds nothing indexed under a thought's value, and throws `pathToContext: Missing thought with id …` before `pathExists` is reached at all. Drop the conversion and the call still compiles and answers correctly, because the argument was a Context wearing a `Path` the whole time. One expression carries both halves: an `as Path` that the brand cannot check, and a `Context` parameter that would have taken a genuine `Path` without a word.

**Where the `null` cannot be removed, make it loud.** [`contextToPathOrThrow`](../../../src/test-helpers/contextToPathOrThrow.ts) is the shipped shape — the same lookup, a throw naming the calling helper and the unresolved context, for the reason [testing.md](../../testing.md) gives under `src/test-helpers/`. An application call site has the same choice and less to catch it.

## Why This Matters

Nothing flags a dead guard. It type-checks, lints and formats like any other line, and removing this one touched `jump.ts` alone — 9a9ae03e80 is eight lines in, six out, in a single file, leaving the 21 tests in `src/commands/__tests__/jump.ts` unedited. That is the equivalence proof and simultaneously the measure of what a suite cannot see, since every one of those tests had always run the branch that survived. A wrong-shaped argument here produces no exception, no console warning and no debug-log entry; it produces `false`, which is a plausible answer to "does this path exist".

`docs/` states the brand in one direction and stops there ([ThoughtId](../../data-model.md#thoughtid)). `contextToPath` is absent from the selector reference entirely — the deprecation note there belongs to `contextToThoughtId` — so a reader who looks it up finds nothing at all.

## When to Apply

- **Before passing a `Path` or `SimplePath` into a parameter typed `string[]` or `Context`,** insert `pathToContext(state, path)` or switch to the id-based selector. A parameter named `path`, `at`, `from` or `pathUnranked` is not evidence of what it wants; its body is.
- **When a new helper resolves by value, type the parameter `Context` and name it `context`** — then throw on a failed lookup rather than returning `null`. The type only documents, since `Context` *is* `string[]`; the throw is the part that enforces anything.
- **When a boolean guard over the thoughtspace never seems to flip, check the provenance of its arguments before its logic.** Print the call against a known-good value beside the real input, the way #5113 did. A constant `false` costs one line to confirm and is otherwise invisible.
- **Watch for a new application caller of `contextToPath`.** `grep -rn 'contextToPath' src --include='*.ts' --include='*.tsx' | grep -v test` returns seven lines: its own signature and export, the two in `pathExists.ts`, and three comments that merely mention it, in [`useDragAndDropToolbarButton`](../../../src/hooks/useDragAndDropToolbarButton.ts), [`removeToolbarButton`](../../../src/actions/removeToolbarButton.ts) and `importFiles.ts`. Its JSDoc says it "should be converted to a test-helper only"; an eighth line is the review question.

## Examples

The conversion `pathExists` requires, in `initEvents`'s `onPopstate`:

```ts
if (!path || !pathExists(state, pathToContext(state, path)) || equalPath(lastPath, path)) {
```

`pathToContext` is exactly right for a `Path` and exactly wrong for this one, and the type-checker reports the same thing — nothing — either way.

The test-helper mitigation, for comparison — identical lookup, opposite failure mode:

```ts
const path = contextToPath(state, pathUnranked)
if (!path) {
  throw new Error(`${helperName}: could not resolve the context ${JSON.stringify(pathUnranked)}. …`)
}
```

## Related

- #5113 — removed the dead guard from `jump`. #5112 — replaced another `contextToPath` caller with `thoughtToPath`.
- [data-model.md → ThoughtId](../../data-model.md#thoughtid), [Context](../../data-model.md#context), [Path](../../data-model.md#path) — the three definitions the assignability follows from.
- [data-model.md → Lookup & conversion](../../data-model.md#lookup--conversion) — `thoughtToPath`, `pathToContext`, `thoughtToContext`, and the `contextToThoughtId` deprecation note.
- [glossary → Brand, Context, ThoughtId, jump history](../../glossary.md) — one-line definitions of each.
- [testing.md → `src/test-helpers/`](../../testing.md) — why the value-keyed helpers throw instead of passing `null` on.
