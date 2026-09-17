---
title: savingProgress has had no writer since the TreeCRDT migration
date: 2026-09-17
category: persistence
module: persistence
problem_type: logic_error
component: frontend
symptoms:
  - Footer never reads Online while connected; it sits on "Replicating ..." indefinitely
  - Closing the tab during a write never raises the browser's unsaved-changes prompt
  - A write that hangs forever produces no error alert and no forced reload
root_cause: missing_writer
resolution_type: documentation_update
severity: high
tags: [persistence, syncstatus, beforeunload, dead-code, treecrdt, watchdog]
---

# savingProgress has had no writer since the TreeCRDT migration

## Problem

Open em against a reachable sync server and read the footer. It says `Replicating ...` and stays there; no amount of waiting turns it into `Online`. That is the cheapest visible edge of a larger fact: nothing in `src/` writes `savingProgress` or `replicationProgress` on [`syncStatusStore`](../../../src/stores/syncStatus.ts) any more. `savingProgress` is pinned at its initial `1` and `replicationProgress` at its initial `null`, so `Status` in [`Footer.tsx`](../../../src/components/Footer.tsx) takes the `!replicationPercentage` branch on every render.

The one-line check that settles it:

```sh
grep -rn "syncStatusStore.update" src/
```

Five sites, and none of them touches either field — `isPulling` in [`pullQueue.ts`](../../../src/redux-middleware/pullQueue.ts):132,162, and `importProgress` in [`importFiles.ts`](../../../src/actions/importFiles.ts):258,444 and [`Alert.tsx`](../../../src/components/Alert.tsx):85. A ministore has no other mutator, so a key absent from that list is a constant. The last writer of `savingProgress` went out in 5e38e2028a (#4325, 2026-08-20) with the rest of the Yjs thoughtspace.

Two safety nets in [`initEvents.ts`](../../../src/util/initEvents.ts) still read it, and both are inert:

- **`onBeforeUnload`** (the `savingProgress < 1` guard at :120) is registered at :404 and removed at :438. With the value pinned at `1` the guard never holds, so closing a tab mid-write never warns.
- **`saveErrorReload`** (:146), subscribed at :423, is the stuck-save watchdog: after `SAVE_ERROR_TIME` of `savingProgress < 1` it dispatches `Save error detected. Reloading to prevent data loss...`, waits `SAVE_ERROR_RELOAD_TIME`, removes the `beforeunload` listener so the confirmation dialog cannot block it, and force-reloads the page. It landed in 31f8999396 against "a known issue where saving gets stuck after and/redo" — its comment names no issue number. It is unarmable for a second, independent reason: `subscribeSelector` in [`ministore.ts`](../../../src/stores/ministore.ts):79-83 invokes the handler only `if (!equals(value, valueOld))`, so a value that never changes never calls it at all — not even with the `1` it would ignore.

Four artifacts will tell a reader otherwise:

| Artifact | What it asserts | Reality |
| --- | --- | --- |
| [`syncStatus.ts`](../../../src/stores/syncStatus.ts):3 | The store is "Updated by the treecrdt thoughtspace data provider" | The provider updates nothing in it |
| [`syncStatus.ts`](../../../src/stores/syncStatus.ts):12 | `savingProgress` is "Progress of saving thoughts to IndexedDB" | Thoughts go to SQLite in OPFS, and nothing computes the progress |
| [`initEvents.ts`](../../../src/util/initEvents.ts):141-145 | The watchdog fires "If it takes longer than 3 seconds to save" | The timer is never started |
| [`glossary.md`](../../glossary.md):167 | "`syncStatusStore.replicationProgress` tracks it for the UI" | Describes the pre-TreeCRDT arrangement; a separate [`docs-sync`](../../../.github/skills/docs-sync/SKILL.md) item |

## Symptoms

- The footer never reaches `Online`. `Replicating ...` with no percentage is the tell — a real replication pass would show a number.
- No unsaved-changes prompt on close, ever, whatever is in flight.
- A write that stalls — a rejected `persistPushQueueBatches`, a barrier that never drains — produces no alert and no reload, only silence.
- The footer's `Saving N%` branch is *not* dead: `importProgress` is still written, so it is live during a file import and pinned at 100% the rest of the time.

## Solution

Nothing is re-armed here. Anyone touching this picks one of two directions deliberately:

- **Re-derive the signal.** [`pushQueue.ts`](../../../src/redux-enhancers/pushQueue.ts) already separates the batches it is about to flush from the rest ([persistence.md → Push queue](../../persistence.md#push-queue-redux--treecrdt)), so pending versus flushed is exactly the 0–1 the field wants. [Write barrier](../../persistence.md#write-barrier) and [Runtime lifecycle](../../persistence.md#runtime-lifecycle) have the stall modes a re-armed watchdog would catch — the failure class of #1404, closed unable-to-reproduce.
- **Delete it.** `savingProgress`, `replicationProgress`, the `onBeforeUnload` guard and `saveErrorReload` all go together. #5002 and #5214 are the precedent: a field with no live counterpart is removed rather than left plausible.

What exists today is forensic rather than preventive — #5188 added `push` / `pushSynced` / `pushError` entries, so a write that never completed is visible afterwards in an exported log ([debug-log.md → Reading a log](../../debug-log.md#reading-a-log)). Leaving the guards in place on top of that advertises a runtime guarantee em does not make.

## Why This Works

A ministore's state changes through `update()` and nothing else — `reset` is `update(initialState)` ([`ministore.ts`](../../../src/stores/ministore.ts):109), and test helpers are its only callers — so the grep is exhaustive rather than suggestive: enumerate the keys passed to `syncStatusStore.update` and any key of the store's type not among them is a constant for the life of the page. Every read of that key — a guard, a subscription, a `useSelector` — is then a constant too, however dynamic it looks. `subscribeSelector`'s change filter turns that from a wrong value into no call at all, which is why the watchdog leaves no trace in a console or a debug log to contradict its comment.

The footer tell works for the same reason from the outside: `replicationProgress` pinned at `null` makes `!replicationPercentage` permanently true, and that branch is reachable only when the connection is up. So `Replicating ...` on a healthy connection is a direct read of the constant, with no grep required.

## Prevention

- Diff the store's type against its writers before trusting any field on it: the keys in `syncStatus.ts` versus the keys in `grep -rn "syncStatusStore.update" src/`. This is #5002's write-only `schemaVersion` inverted — there, nothing read the value; here, nothing writes it — and the same audit finds both.
- A safety net subscribed through `subscribeSelector` needs a test that drives its *producer*. There are no tests referencing `savingProgress` anywhere in `src/`, which is why deleting the producer broke two guards and failed nothing.
- Assert the footer reaches `Online` in a connected e2e run. Nothing asserts footer status today, and that single assertion covers the whole chain from writer to render.
- When a migration removes a data provider, grep the stores it fed before deleting it. `git log -S'<field>' --oneline -- src/` names the commit that took the writer out; here it is one line.

## Related

- #1631 — the undo/redo stuck-save report whose symptom `saveErrorReload`'s comment describes; closed completed before the watchdog landed.
- #1404 — the failure class the watchdog would catch, closed unable-to-reproduce.
- #5188 — the debug-log entries that detect a stalled write after the fact.
- #5214, #5002 — how this repo has handled the TreeCRDT migration's other orphans.
- [persistence.md → Push queue](../../persistence.md#push-queue-redux--treecrdt), [Write barrier](../../persistence.md#write-barrier), [Runtime lifecycle](../../persistence.md#runtime-lifecycle)
- [debug-log.md → Reading a log](../../debug-log.md#reading-a-log)
