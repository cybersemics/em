---
title: Editing a thought overwrites the persisted Lexeme with only the loaded contexts
date: 2026-09-17
category: data-model
module: lexemes
problem_type: logic_error
component: frontend
symptoms:
  - Editing a thought to a value that already exists elsewhere shows no superscript on the edited thought
  - After a second refresh the other instance has lost its superscript too
  - The stored Lexeme lists one context where two are expected
  - Contexts that were never pulled disappear from storage, not only from the screen
root_cause: in_memory_partial_state
resolution_type: test_fix
severity: high
tags: [lexeme, data-loss, editthought, push-queue, superscript, open-bug]
---

# Editing a thought overwrites the persisted Lexeme with only the loaded contexts

## Problem

`Lexeme.contexts` is rebuilt from Redux on every edit and never merged with what is on disk. [`editThought`](../../../src/actions/editThought.ts) resolves the destination Lexeme with `const thoughtCollision = getLexeme(state, newValue)`, and [`getLexeme`](../../../src/selectors/getLexeme.ts) is a one-line lookup in `state.thoughts.lexemeIndex` ([Data Model § Lexemes](../../data-model.md#lexemes)). Only the visible slice of the thoughtspace is in that index — everything else was never pulled or was freed ([Persistence § In-memory state](../../persistence.md#in-memory-state-redux), [§ Memory management](../../persistence.md#memory-management)). So a Lexeme whose other contexts are not loaded is not a partial Lexeme; it is `undefined`, and the reducer falls through to its literal

```ts
const lexemeNewWithoutContext: Lexeme = thoughtCollision || {
  contexts: [],
  created: timestamp(),
  lastUpdated: timestamp(),
  updatedBy: clientId,
}
```

`addContext` puts the one edited thought into that empty array, it goes into `lexemeIndexUpdates`, and the push queue upserts it whole.

The old value's key is written from the same fragment in the same batch. `newOldLexeme` is `removeContext(lexemeOld, editedThoughtId)`, except that `isThoughtOldOrphan` — `lexemeOld.contexts.length < 2` — substitutes `null` whenever the loaded fragment held a single context, and `null` deletes the row.

The storage half is what turns a stale screen into lost data. `upsertLexeme` in [`treecrdt/lexemes.ts`](../../../src/data-providers/treecrdt/lexemes.ts) is `ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json` — the serialized `Lexeme` replaces the row ([Persistence § Derived tables](../../persistence.md#derived-tables), [§ Writes](../../persistence.md#writes) step 1). Nothing below the action layer merges contexts, so whatever the reducer computed from the loaded slice is now the whole truth.

The storage half is a regression from #4325, which is why the bug got worse rather than older. The YJS provider it replaced wrote contexts as a nested `Y.Map` — `updateLexeme` diffed `lexemeNew` against `lexemeOld` and set or deleted individual `cx-<cxid>` keys. A context absent from memory was in neither set, so it was never touched and the stored Lexeme survived a wrong in-memory one.

The same read/write shape sits in three more places, all reachable the same way:

| Action | In-memory read | What reaches `lexemeIndexUpdates` |
| --- | --- | --- |
| [`editThought`](../../../src/actions/editThought.ts) | `getLexeme(state, newValue)` | `addContext` onto the fallback `{ contexts: [], … }` |
| [`createThought`](../../../src/actions/createThought.ts) | `getLexeme(state, value)` | `contexts: [...(lexemeOld?.contexts \|\| []), …]` |
| [`deleteThought`](../../../src/actions/deleteThought.ts) | `getLexeme(state, value!)` | `removeContext(lexeme, thoughtId)`, or `null` when a persisted delete empties the result |
| [`mergeThoughts`](../../../src/actions/mergeThoughts.ts) | `getLexeme(state, sourceThought.value)` | `removeContext(lexeme, sourceThought.id)` |

`removeContext` on a fragment yields a Lexeme missing every unloaded context, and the `null` case deletes the row that held them ([§ Writes](../../persistence.md#writes) step 1). Only the deallocation path is careful: `deleteThought` keeps the Lexeme intact when `persist` is false, precisely because dropping one context of a Lexeme it does not fully hold would be wrong.

## Symptoms

With

```
- x
- a
  - b
    - c
      - d
```

put the cursor on `x`, refresh, and edit `x` to `d`. The root `d` shows no superscript, because the `d` Lexeme in memory now lists exactly one context. Refresh again and expand `a/b/c`: `a/b/c/d` has lost its superscript too. That second refresh is the part that matters — it is reading the stored Lexeme, and the stored Lexeme is down to one context (#5353). The create-side version is the same two refreshes with a new thought instead of an edit (#5426, #1074).

## What Didn't Work

**Asserting on the superscript.** #5354 drives the steps above in Puppeteer and waits for the superscript that should appear, which is the honest user-level assertion. It never merged. A timeout there is the same failure a slow pull, a missed render or a broken selector produces, so it pins the tell without pinning the cause. The reproduction that merged instead (#5458) asserts against the provider — `getLexemeFromProvider(db, 'f')` — and fails on the value itself:

```
AssertionError: expected [ 'd292435210fa78580a67472161fba482' ] to deeply equal ArrayContaining{…}
- ArrayContaining [
-   "2ac122428055a3cf6a2b4fd63ef34346",
+ [
    "d292435210fa78580a67472161fba482",
  ]
```

That names the persisted contexts array, which is the thing that is wrong.

**Shipping that reproduction as a normal test.** It is red against `main`, so it went in as `it.skip`.

## Solution

There is no fix. #5426 and #1074 are open, #5353 was closed as a duplicate, and what the repo ships in place of a fix is a pinned specification: two deliberately red tests in [`redux-middleware/__tests__/pushQueue.ts`](../../../src/redux-middleware/__tests__/pushQueue.ts), `editing a thought should load the lexeme and merge contexts` (#1074) and `a new thought should merge into an unloaded lexeme and persist both contexts across a refresh` (#5426). Each imports a deep tree, refreshes, asserts the Lexeme is genuinely absent from state, performs the edit or the creation, and then checks `getLexemeFromState` and `getLexemeFromProvider` for two contexts. The create-side test refreshes once more before asserting, so its state read is of a reloaded index rather than the one the reducer just wrote. They run under Vitest, driving the push queue with `vi.runAllTimersAsync`.

The rule they encode, for anyone about to touch this code: **in-memory absence of a Lexeme is not emptiness.** Before computing `lexemeIndexUpdates` from `getLexeme`, assume the Lexeme is a fragment. A fix has to read the persisted Lexeme — `getLexemeById` / `getLexemesByIds` on the [`DataProvider`](../../../src/data-providers/DataProvider.ts), or the [`getLexeme` data helper](../../../src/data-providers/data-helpers/getLexeme.ts) — and merge, because `upsertLexeme` cannot merge on its own: the row it is replacing is the only place the missing contexts exist.

## Why This Works

[Testing § Do not hide tests](../../testing.md#6-do-not-hide-tests) requires a `.skip` to link the issue that will enable it, and counts it as documentation of intended behaviour rather than as coverage. These two are the permanent case of that, not the transient TDD red-test marker described beside it: the issues they link are open, no fix is queued, and the tests exist so the intended merge semantics are written down in executable form instead of living only in a closed thread. Unskipping both is the acceptance criterion for the fix.

The assertion is at the provider rather than the UI for the same reason the store test displaced the Puppeteer one: [`Superscript`](../../../src/components/Superscript.tsx) is a `getContexts` read of the in-memory Lexeme, and the bug is in the row behind it.

## Prevention

- Treat every `getLexeme(state, …)` whose result flows into `lexemeIndexUpdates` as a fragment. Today that is `editThought`, `createThought`, `deleteThought` and `mergeThoughts`; `grep -n 'getLexeme(' src/actions/*.ts` finds any new one.
- Do not add a context merge to `upsertLexeme`. It receives a complete `Lexeme` and has no way to tell a deliberate context removal from an unloaded one; the merge has to happen where the intent is known, which is above the push queue ([Persistence § Push queue](../../persistence.md#push-queue-redux--treecrdt)).
- A change claiming to fix this removes `.skip` from both tests in [`pushQueue.ts`](../../../src/redux-middleware/__tests__/pushQueue.ts) and leaves them green. Each asserts state *and* provider contexts; a fix that repairs only the in-memory index passes half of each test and still loses the row.
- When a change makes a Lexeme's `contexts` shorter, check whether the thoughts it dropped were loaded. `getLexemeFromProvider(db, value)` in a store test reads the persisted array directly.

## Related

- #5426 — open; the create-side report.
- #1074 — open; the original report, from before the persisted Lexeme was also being clobbered.
- #5353 — closed as a duplicate; the edit-side reproduction quoted above.
- #5458 — the merged skipped store test.
- #5354 — the unmerged Puppeteer test.
- #2173 — closed as not planned in 2024; the same hole reported against the YJS stack, and its `getLexemeById` narrative describes code #4325 removed.
- [Data Model § Lexeme](../../data-model.md#lexeme) — the `contexts: ThoughtId[]` shape and the hashing that decides which thoughts share one.
- [Persistence § Writes](../../persistence.md#writes) — how `lexemeIndexUpdates` reaches `em_lexemes`.
- [Changing `normalizeThought` silently re-keys every Lexeme](changing-lexeme-hashing-is-not-a-migration.md) — the argument that a stale Lexeme self-heals the next time a thought with that value is touched, which depends on the write path this file shows to be lossy.
