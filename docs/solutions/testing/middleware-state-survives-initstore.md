---
title: Middleware and enhancer closure state survives initStore
date: 2026-09-17
category: testing
module: redux_middleware
problem_type: convention
component: testing_framework
severity: high
applies_when:
  - Writing a new middleware under src/redux-middleware or a new enhancer under src/redux-enhancers
  - Adding a module- or closure-scoped variable, or a lodash debounce or throttle, to an existing one
  - Reviewing a change that keeps state outside Redux because the middleware is its only consumer
  - A store or JSDOM test passes alone and fails when run after its neighbours, or the reverse
  - Diagnosing a test whose result depends on its position in the file
tags:
  - testing
  - redux-middleware
  - redux-enhancers
  - test-isolation
  - initstore
  - debounce
---

# Middleware and enhancer closure state survives initStore

## Context

Any mutable state a middleware or enhancer holds outside Redux — a module-level variable, a variable in the factory's closure, or a pending debounced or throttled callback — survives [`initStore`](../../../src/test-helpers/initStore.ts). It must reset itself when it sees `action.type === 'clear'`, or it leaks into the next test in the file and fails *that* test rather than the one that dirtied it.

Store and JSDOM tests share one Redux store, [`stores/app.ts`](../../../src/stores/app.ts), constructed at module import time. That is a decision rather than an accident of convenience. #2338 and #2756 retired `createTestStore` because the parallel store had already drifted from the app's — it ran with `updateUrlHistoryMiddleware` and `storageCacheStoreEnhancer` commented out — and would go on drifting as more were added. Recreating the store per test was rejected in the same thread as too large a change, since the store is built at import time and tests import it directly. The third candidate, resetting the dirty variable from the test file's own `beforeEach`, is the pattern #4912 removed for ministores: it encodes the clean state at the call site and requires every test author to know which module-level singletons exist.

What is left is `clear`. `initStore` dispatches it and, since #4912, also calls `resetStores()`; [Testing → Isolation and cleanup](../../testing.md#isolation-and-cleanup) lists exactly what those two cover, and [`beforeEach(initStore)`](../../testing.md#2-store-tests) is the setup every store test uses. The delta this file records is that the same guarantee stops at the store boundary. `clear` resets the state tree and the [ministores](../../glossary.md#m); it cannot reach a closure, because all a middleware receives is the action, and a middleware that does not look for `clear` never sees it. Vitest isolates modules per test *file*, so the leak is bounded to one file — which is what makes it read as flakiness instead of as a bug.

#3897 is the incident. [`undoRedoEnhancer`](../../../src/redux-enhancers/undoRedoEnhancer.ts) held `lastEditThoughtDirection` at `Longer` across test boundaries, so a test under `grouping` in [`undo-redo.ts`](../../../src/commands/__tests__/undo-redo.ts) passed or failed according to its position in the file, while the variable stayed invisible in the state a test inspects. #3979 fixed it with the same `clear` branch [`pullQueue`](../../../src/redux-middleware/pullQueue.ts) already carried — which is the whole of the convention, and is written down nowhere an author of a new middleware would look.

## Guidance

For anything under [`/src/redux-middleware` or `/src/redux-enhancers`](../../folder-structure.md):

- **Reset every variable that outlives an action** on `clear` — module scope and factory-closure scope alike — to the same value it was initialised with.
- **`.cancel()` every pending `_.debounce` and `_.throttle` wrapper** in the same branch. `cancel` is what drops the scheduled call; the `vi.useFakeTimers()` in `initStore` only keeps it from firing after teardown, not from firing against the next test's state once that test advances timers.
- **Keep the reset next to the declaration in review.** Both shapes in the tree are a single branch taken ahead of the rest of the action handling:

```ts
// pullQueue.ts, after next(action)
if (isAction(action) && action.type === 'clear') {
  updatePullQueueDebounced.cancel()
  flushPullQueueThrottled.cancel()
  pullQueue = initialPullQueue()
  lastExpandedPullQueue = {}
}

// undoRedoEnhancer.ts, first branch of the wrapped reducer
if (actionType === 'clear') {
  lastAction = undefined
  lastEditThoughtDirection = EditThoughtDirection.None
  return reducer(state, action)
}
```

- **Audit rather than remember.** `rg -n 'let |new (Set|Map)|_\.(debounce|throttle)' src/redux-middleware src/redux-enhancers` enumerates every candidate in under a second; each hit either appears in a `clear` branch in the same file or is a deliberate exception. Nothing enforces this — there is no lint rule, and no test dispatches `clear` and asserts that a middleware is clean.

## Why This Matters

The diagnostic signature is the expensive part to rediscover: **a store or JSDOM test that passes alone and fails when run after its neighbours, or passes only in that position, is a closure-state leak before it is a bug in the test.** Reordering the file, or running the one test with `.only`, changes the result — which looks like the test being wrong and is not. As #4912 put it for ministores, a setup-versus-teardown leak surfaces one test later than its cause, in a test that did nothing wrong.

Neither existing handler helps a reader arrive at that. `pullQueue`'s comment is "reset internal pullQueue when clear action is dispatched" and the enhancer's is "Clear the last edit thought direction when the clear action is executed" — which describes half of what its branch does. Both read as local housekeeping; neither says the word *test*.

## When to Apply

At the moment a `let`, a `Set`, or a `_.throttle` is added to a file in either directory — that is the only cheap moment. Reviewing such a change, the question is not whether the state is correct at runtime but what it holds at the start of the second test in a file.

## Examples

**The two that handle `clear`.** `pullQueue` cancels `updatePullQueueDebounced` and `flushPullQueueThrottled` and rebuilds `pullQueue` and `lastExpandedPullQueue`; the delays behind those two wrappers are [Persistence → Pull queue](../../persistence.md#pull-queue-treecrdt--redux), and the delta here is only that both are cancelled. Read it as the origin of the pattern rather than a complete instance — five more variables in the same file survive the branch. `undoRedoEnhancer` resets `lastAction` and `lastEditThoughtDirection`, declared in the `undoRedoReducerEnhancer` closure; the patch machinery around them is [Commands → Undo history](../../commands.md#undo-history-and-the-undo-slider).

**The several that never have.** Of the nine modules across the two directories holding state outside Redux, those two are the only ones that look at `clear`:

| File | Survives `clear` |
| --- | --- |
| [`pullQueue.ts`](../../../src/redux-middleware/pullQueue.ts) | `pulled` (module scope); `isLoaded`, `pulling`, `cancelRef`, `prevCursor` (closure) — in the file that resets two others |
| [`updateUrlHistory.ts`](../../../src/redux-middleware/updateUrlHistory.ts) | `pathPrev`, `cursorPrev`, `cursorThoughtValuePrev`, and the `saveCursor` / `updateUrlHistoryThrottled` throttles |
| [`multiselectCursorMiddleware.ts`](../../../src/redux-middleware/multiselectCursorMiddleware.ts) | `parked` |
| [`loggerMiddleware.ts`](../../../src/redux-middleware/loggerMiddleware.ts) | `reportedDuplicateRanks` |
| [`multicursorAlertMiddleware.ts`](../../../src/redux-middleware/multicursorAlertMiddleware.ts) | `throttledAlert` |
| [`freeThoughts.ts`](../../../src/redux-middleware/freeThoughts.ts) | `checkThrottled` |
| [`storageCache.ts`](../../../src/redux-enhancers/storageCache.ts) | `throttledSetters` |
| [`updateJumpHistoryEnhancer.ts`](../../../src/redux-enhancers/updateJumpHistoryEnhancer.ts) | `saveJumpHistory` |

`saveJumpHistory` has already fired after a test file was torn down: the `localStorage` fallback on the global prototype in [`setupTests.ts`](../../../src/setupTests.ts) exists for that (#3345). Same pending-callback leak, landing after teardown instead of in the next test.

`parked` is the clearest evidence that the convention is unwritten: it arrived in #5425 with a comment justifying module state over Redux state on the grounds that the middleware is its only consumer and a park never outlives its multiselection — an argument about runtime that says nothing about the second test in a file, from an author who had no way to know the rule existed.

**Not an instance of the contract.** `undoRedoEnhancer` resets the same two variables a second time on `undo` and `redo`. That one exists so the next action does not merge with whatever patch sits on top of the stack; it is merge-direction correctness, and reading it as the `clear` convention will lead to the wrong reset in the wrong branch.

## Related

- #3897, #3979, #2338, #2756, #4912, #5425
- [Testing → Isolation and cleanup](../../testing.md#isolation-and-cleanup) — what `initStore`, `createTestApp` and `cleanupTestApp` do reset, and the per-file module isolation this trap sits inside.
- [Testing → Store Tests](../../testing.md#2-store-tests) — the `beforeEach(initStore)` idiom every command test uses.
- [Persistence → Pull queue](../../persistence.md#pull-queue-treecrdt--redux) and [Commands → Undo history](../../commands.md#undo-history-and-the-undo-slider) — what the two resetting modules do when they are not being cleared.
