---
title: Why the thoughtspace is one CRDT tree, not per-parent subdocuments
date: 2026-09-17
category: persistence
module: persistence
problem_type: architecture_pattern
component: frontend
severity: medium
applies_when:
  - Proposing lazy-loaded per-parent documents to bound what a large thoughtspace holds in memory
  - Evaluating a CRDT library on its partial-sync or lazy-loading support
  - Adding a second document, database, or replication cursor to the persistence layer
  - Asking why freeThought and freeLexeme are no-ops rather than cache evictions
  - Reading a 2024 thread that treats duplicate ranks as survivable
tags:
  - treecrdt
  - yjs
  - subdocuments
  - rejected-architecture
  - replication
  - scaling
---

# Why the thoughtspace is one CRDT tree, not per-parent subdocuments

## Context

[Persistence → Document model](../../persistence.md#document-model) states the shape as a bare fact: one CRDT tree per thoughtspace, not one document per parent thought. What it does not record is that em shipped the alternative for years and abandoned it.

That alternative was a managed graph of [Yjs subdocuments](https://docs.yjs.dev/api/subdocuments) — one document per parent thought, paged in and out as the cursor moved, with an append-only doclog tracking global replication status so a client could tell which subdocuments it still owed. It was built, shipped, and taken out in two stages: the doclog, `replicationController` and `ThoughtspaceExtension` first, then everything else when TreeCRDT replaced Yjs (both dated in the shelf-life table in [`solutions/readme.md`](../readme.md#shelf-life)). #5214 removed the last scaffolding — `server/`, `WebsocketProviderType.ts`, `VITE_WEBSOCKET_HOST` — so nothing in `src/` hints that the design ever existed.

## Guidance

**Reach for the transaction boundary first.** A Yjs transaction is scoped to one `Y.Doc`, and a subdocument is a separate `Y.Doc`, so a move touching two parents — the ordinary case: every drag, every indent, every sort — is two independent documents' worth of operations with no atomicity between them, and a peer can observe one half. Nothing guarantees tree validity, and guaranteeing tree validity is the whole difficulty of a tree CRDT. #2291 gives this equal billing with the server's performance collapse as the pair of reasons em stopped pursuing the design; of the two it is the one that no amount of engineering removes.

Three further properties of the approach, each a reason on its own:

- **Subdocument support exists in the Yjs core and in no provider.** There is a little scaffolding for loading subdocuments automatically; provider support is absent. There is consequently no way to confirm that the whole graph has synced.
- **The subdocument key set does not fit in one document.** So deciding when to page a subdocument in or out of memory, and tracking replication progress across the graph, had to be custom built — that is what the doclog was. Today's [opt-in remote sync](../../persistence.md#remote-sync-opt-in) has one document and therefore no per-document progress to track at all.
- **The syncing server's compute and memory both broke down at roughly 100k nodes.** That figure comes from #2291 in August 2024 and is observed behaviour at the time, not a re-checkable limit: no `server/` survives in the tree to measure.

### Alternatives weighed in the same thread

| Considered | Why not |
| --- | --- |
| [Liveblocks](https://liveblocks.io) | Buys the missing subdocument and auth support — the thread names Hocuspocus as the same kind of answer — but still needs webhook replication into a separate indexable store, and carries a cost that compounds over time. |
| [Loro](https://loro.dev) | Has a built-in tree CRDT and is significantly faster, but no partial sync and no lazy loading. |
| A fully custom fractional-indexing CRDT | Removes the dual-store complexity, but is far slower to build and is not maximally non-interleaving. |

### The web worker failures are a cost record, not a live trap

Replication carried an unresolved cost of its own: the web worker went unresponsive on unsuspend and mid-replicate (#1742, #1741). The suspects recorded there were server backpressure on `db.getYDoc`, a Comlink proxy-release bug, and `WebsocketProvider` construction — merely constructing one was enough to induce it, unsaved and unsubscribed. Both issues closed undiagnosed. The worker, the provider and Comlink are all gone from the tree, so this counts against the cost of running a replicating document graph and nowhere else.

### Duplicate ranks were survivable in 2024; they are a corruption signature now

The same thread recorded em's ordering requirement as it stood then: `rank` was a numeric field independent of array order, and duplicate ranks were survivable — siblings rendered adjacent in a nondeterministic order, with the client free to finalise it on detection. **That is the superseded position.** Order is now a property of the tree: [data-model.md → rank](../../data-model.md#rank), [Persistence → Order and placement](../../persistence.md#order-and-placement), and the `integrity` bullet in [Debug Log → Reading a log](../../debug-log.md#reading-a-log).

The tightening is not finished. `getTreecrdtPlacement` in [`treecrdt/thoughtspace.ts`](../../../src/data-providers/treecrdt/thoughtspace.ts) still falls back to `getRankPlacement`, deriving a placement from `thought.rank`, for a new insert and for a placement naming a sibling that has since departed, under a `TODO` to be removed. Only a move of an existing thought is resolved with `requireExplicit`, and only that path throws when no placement is supplied.

## Why This Matters

#2291 is the demonstration that this recurs. An outside CRDT engineer, with no knowledge of what em had built, proposed exactly this architecture — Yjs subdocuments for lazy loading, a custom tree CRDT over the Yjs list algorithm, an adjacent store for indexing — in a proposal posted after missing the job posting's cutoff. He arrived at it for the reason anyone will, bounding what a large thoughtspace holds in memory, and that pressure is still real.

em answers it on the Redux side instead. [`actions/freeThoughts.ts`](../../../src/actions/freeThoughts.ts) evicts down to `FREE_THOUGHTS_MARGIN` below `globals.freeThoughtsThreshold`, driven by the middleware described at [Persistence → Memory management](../../persistence.md#memory-management) — which is also where `freeThought` / `freeLexeme` having nothing to release is explained, along with the [glossary](../../glossary.md) entry.

Point a fresh proposal at the transaction boundary before the provider gaps and before the numbers. The gaps and the numbers each have an engineering answer; that one does not.

## When to Apply

- A design bounds memory by splitting the thoughtspace across documents, databases, or files. Ask first what a cross-parent move looks like when only one half arrives.
- A CRDT library is being evaluated on partial sync or lazy loading. Check whether a *provider* implements it, not whether the core has an API for it, and check whether a transaction can span the unit being loaded.
- Something proposes tracking replication progress per unit. The last thing that needed that needed a whole append-only log, and the key set outgrew the document meant to hold it.

## Examples

The decision is visible in today's tree as a set of singulars. `getTreecrdtClientOptions` in [`treecrdt/runtime.ts`](../../../src/data-providers/treecrdt/runtime.ts) names one document and one file, and the runtime creates exactly one client from it:

```ts
const getTreecrdtClientOptions = (storage: ThoughtspaceStorage): ClientOptions => ({
  storage:
    storage === 'memory'
      ? { type: 'memory' }
      : {
          type: 'opfs',
          filename: `/treecrdt-em-${tsid}.db`,
          fallback: 'memory',
        },
  runtime: { type: storage === 'memory' ? 'direct' : 'dedicated-worker' },
  docId: tsid,
})
```

One file that is single-writer is why [`sessionLock.ts`](../../../src/data-providers/treecrdt/sessionLock.ts) takes a single exclusive Web Lock named `em-treecrdt-session:${tsid}` and holds it for the life of the page — see [Persistence → Single-tab access](../../persistence.md#single-tab-access). One file is what makes one lock sufficient.

## Related

- #2291, #5214, #1742, #1741
- [Persistence → Document model](../../persistence.md#document-model), [→ Order and placement](../../persistence.md#order-and-placement), [→ Memory management](../../persistence.md#memory-management), [→ Remote sync (opt-in)](../../persistence.md#remote-sync-opt-in)
- [data-model.md → rank](../../data-model.md#rank)
- [Debug Log → Reading a log](../../debug-log.md#reading-a-log)
